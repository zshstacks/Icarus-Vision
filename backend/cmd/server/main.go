package main

import (
	"errors"
	"fmt"
	"icarus-vision/internal/config"
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
