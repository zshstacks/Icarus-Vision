package http

import (
	"icarus-vision/internal/auth"
	"icarus-vision/internal/transport/ws"

	"github.com/labstack/echo/v5"
)

func RegisterRoutes(e *echo.Echo, h *ws.Handler, tracksHandler *TracksHandler, authHandler *auth.AuthHandler, jwtSecret string) {

	authGroup := e.Group("/auth")
	authGroup.POST("/login", authHandler.Login)
	authGroup.POST("/refresh", authHandler.Refresh)
	authGroup.POST("/logout", authHandler.Logout)

	e.GET("/ws", h.Upgrade)

	api := e.Group("/api")
	api.Use(auth.JWTMiddleware(jwtSecret))
	api.GET("/tracks", tracksHandler.GetTracks)
}
