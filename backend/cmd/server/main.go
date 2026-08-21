package main

import (
	"context"
	"errors"
	"fmt"
	"icarus-vision/internal/broadcaster"
	"icarus-vision/internal/config"
	"icarus-vision/internal/domain"
	"icarus-vision/internal/ingest/adsb"
	http2 "icarus-vision/internal/transport/http"
	"icarus-vision/internal/transport/ws"
	"log"
	"net/http"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

func main() {
	cfg := config.LoadConfig()

	hub := ws.NewHub()

	tokenManager := adsb.NewTokenManager(cfg.OpenSky.ClientID, cfg.OpenSky.ClientSecret)
	client := adsb.NewClientManager(tokenManager)
	worker := adsb.NewWorker(client)

	tracks := make(chan domain.Track)
	b := broadcaster.NewBroadcaster(tracks, hub, worker.Name())

	ctx := context.Background()
	go func() {
		if err := worker.Start(ctx, tracks); err != nil {
			log.Printf("adsb worker stopped: %v", err)
		}

	}()

	go func() {
		b.Run(ctx)
	}()

	go hub.Run()

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

	if err := e.Start(port); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}

}
