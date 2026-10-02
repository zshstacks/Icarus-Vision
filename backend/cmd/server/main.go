package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"icarus-vision/internal/auth"
	"icarus-vision/internal/broadcaster"
	"icarus-vision/internal/config"
	"icarus-vision/internal/domain"
	"icarus-vision/internal/ingest/adsb"
	"icarus-vision/internal/store"
	http2 "icarus-vision/internal/transport/http"
	"icarus-vision/internal/transport/ws"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

func main() {
	cfg := config.LoadConfig()
	setupLogging(cfg.Environment)

	var wg sync.WaitGroup

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := store.RunMigration(cfg.Database.URL, "migrations"); err != nil {
		slog.Error("migrations failed", "error", err)
		os.Exit(1)
	}

	pool, err := store.NewPool(ctx, cfg.Database.URL)
	if err != nil {
		slog.Error("pool failed", "error", err)
		os.Exit(1)
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

	tracks := make(chan []domain.Track, 1)
	removedTracks := make(chan []string, 1)
	b := broadcaster.NewBroadcaster(tracks, removedTracks, hub, worker.Name(), trackRepo)

	wg.Go(func() {
		if err := worker.Start(ctx, tracks, removedTracks); err != nil {
			slog.Error("adsb worker stopped", "error", err)
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
	healthHandler := http2.NewHealthHandler(pool)

	e := echo.New()

	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     cfg.CORS.AllowedOrigins,
		AllowMethods:     cfg.CORS.AllowedMethods,
		AllowHeaders:     cfg.CORS.AllowedHeaders,
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           int((24 * time.Hour) / time.Millisecond),
	}))
	e.Use(middleware.Recover())
	e.Use(http2.RequestID())
	e.Use(http2.SlogRequestLogger())
	e.Use(http2.MetricsMiddleware())

	e.GET("/metrics", echo.WrapHandler(promhttp.Handler()))

	http2.RegisterRoutes(e, handler, tracksHandler, authHandler, healthHandler, cfg)

	addr := fmt.Sprintf("127.0.0.1:%s", cfg.Server.Port)
	slog.Info("server starting", "addr", addr, "environment", cfg.Environment)

	sc := echo.StartConfig{
		Address:         addr,
		GracefulTimeout: 10 * time.Second,
	}
	if err := sc.Start(ctx, e); err != nil && !errors.Is(err, http.ErrServerClosed) {
		slog.Error("server failed", "error", err)
		os.Exit(1)
	}

	slog.Info("shutting down background workers")
	wg.Wait()
	slog.Info("server gracefully stopped")
}

// configures the global slog logger. JSON in production
func setupLogging(environment string) {
	var handler slog.Handler
	if environment == "production" {
		handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelInfo,
		})
	} else {
		handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelDebug,
		})
	}
	slog.SetDefault(slog.New(handler))
}
