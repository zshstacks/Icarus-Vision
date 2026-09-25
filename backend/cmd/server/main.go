package main

import (
	"context"
	"errors"
	"fmt"
	"icarus-vision/internal/auth"
	"icarus-vision/internal/broadcaster"
	"icarus-vision/internal/config"
	"icarus-vision/internal/domain"
	"icarus-vision/internal/ingest/adsb"
	"icarus-vision/internal/store"
	http2 "icarus-vision/internal/transport/http"
	"icarus-vision/internal/transport/ws"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

func main() {

	var wg sync.WaitGroup

	cfg := config.LoadConfig()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := store.RunMigration(cfg.Database.URL, "migrations"); err != nil {
		log.Fatalf("migrations failed: %v", err)
	}

	pool, err := store.NewPool(ctx, cfg.Database.URL)
	if err != nil {
		log.Fatalf("pool failed: %v", err)
	}
	defer pool.Close()

	authRepo := auth.NewAuthRepo(pool)
	authService := auth.NewAuthService(authRepo, cfg.JWT)
	authHandler := auth.NewAuthHandler(authService, cfg.JWT)

	hub := ws.NewHub()

	tokenManager := adsb.NewTokenManager(cfg.OpenSky.ClientID, cfg.OpenSky.ClientSecret)
	client := adsb.NewClientManager(tokenManager)
	worker := adsb.NewWorker(client)
	trackRepo := store.NewTrackRepo(pool)

	tracks := make(chan []domain.Track, 1) // added a small buffer so the worker can dump final payload and exit cleanly
	removedTracks := make(chan []string, 1)
	b := broadcaster.NewBroadcaster(tracks, removedTracks, hub, worker.Name(), trackRepo)

	wg.Go(func() {
		if err := worker.Start(ctx, tracks, removedTracks); err != nil {
			log.Printf("adsb worker stopped: %v", err)
		}
	})

	wg.Go(func() {
		store.RunRetentionLoop(ctx, pool, 24*time.Hour, 7*24*time.Hour)
	})

	wg.Go(func() {
		b.Run(ctx)
	})

	wg.Go(func() {
		hub.Run(ctx)
	})

	handler := ws.NewHandler(hub, ctx, cfg.JWT.Secret)
	tracksHandler := http2.NewTracksHandler(trackRepo)

	e := echo.New()

	e.Use(middleware.RequestLogger())
	e.Use(middleware.Recover())

	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     cfg.CORS.AllowedOrigins,
		AllowMethods:     cfg.CORS.AllowedMethods,
		AllowHeaders:     cfg.CORS.AllowedHeaders,
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           int((24 * time.Hour) / time.Millisecond),
	}))

	http2.RegisterRoutes(e, handler, tracksHandler, authHandler, cfg.JWT.Secret)

	port := fmt.Sprintf(":%s", cfg.Server.Port)

	sc := echo.StartConfig{
		Address:         port,
		GracefulTimeout: 10 * time.Second,
	}
	if err := sc.Start(ctx, e); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}

	log.Println("--- Shutting down background workers ---")
	wg.Wait()
	log.Println("--- Server gracefully stopped ---")
}
