package main

import (
	"errors"
	"fmt"
	"icarus-vision/internal/config"
	"icarus-vision/internal/domain"
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

	//testing, delete this shit
	go func() {
		ticker := time.NewTicker(1 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			event := domain.Event{
				Type:   "track_update",
				Source: "adsb",
				Data: domain.Track{
					ID:           "ICAO24",
					Callsign:     "FA212",
					Lat:          56.946,
					Lon:          24.105,
					Altitude:     new(5000.0),
					OnGround:     false,
					Speed:        new(112.0),
					Heading:      new(321.0),
					VerticalRate: new(55.0),
					Timestamp:    time.Now().Unix(),
				},
			}

			hub.Broadcast <- &event
		}
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
