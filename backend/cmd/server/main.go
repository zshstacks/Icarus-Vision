package main

import (
	"context"
	"errors"
	"fmt"
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
	"syscall"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

func main() {
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

	hub := ws.NewHub()

	tokenManager := adsb.NewTokenManager(cfg.OpenSky.ClientID, cfg.OpenSky.ClientSecret)
	client := adsb.NewClientManager(tokenManager)
	worker := adsb.NewWorker(client)

	tracks := make(chan domain.Track)
	b := broadcaster.NewBroadcaster(tracks, hub, worker.Name())

	go func() {
		if err := worker.Start(ctx, tracks); err != nil {
			log.Printf("adsb worker stopped: %v", err)
		}

	}()

	go func() {
		b.Run(ctx)
	}()

	go hub.Run(ctx)

	handler := ws.NewHandler(hub)

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

	http2.RegisterRoutes(e, handler)

	port := fmt.Sprintf(":%s", cfg.Server.Port)

	sc := echo.StartConfig{
		Address:         port,
		GracefulTimeout: 10 * time.Second,
	}
	if err := sc.Start(ctx, e); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}
