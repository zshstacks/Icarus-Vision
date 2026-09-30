package http

import (
	"icarus-vision/internal/auth"
	"icarus-vision/internal/config"
	"icarus-vision/internal/transport/ws"
	"time"

	"github.com/labstack/echo/v5"
	"golang.org/x/time/rate"
)

func RegisterRoutes(e *echo.Echo, h *ws.Handler, tracksHandler *TracksHandler, authHandler *auth.AuthHandler, cfg config.AppConfig) {

	//5 attempts, 1 refill per minute
	loginLimit := newLoginLimiter(rate.Every(time.Minute), 5, cfg.Server.TrustedProxies).middleware()

	authGroup := e.Group("/auth")
	authGroup.POST("/login", authHandler.Login, loginLimit)
	authGroup.POST("/refresh", authHandler.Refresh)
	authGroup.POST("/logout", authHandler.Logout)

	e.GET("/ws", h.Upgrade)

	api := e.Group("/api")
	api.Use(auth.JWTMiddleware(cfg.JWT.Secret))
	api.GET("/me", authHandler.Me)
	api.GET("/tracks", tracksHandler.GetTracks)
	api.GET("/tracks/:id/history", tracksHandler.GetHistory)
}
