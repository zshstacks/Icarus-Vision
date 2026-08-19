package http

import (
	"icarus-vision/internal/transport/ws"

	"github.com/labstack/echo/v5"
)

func RegisterRoutes(e *echo.Echo, h *ws.Handler) {
	e.GET("/ws", h.Upgrade)
}
