package http

import (
	"context"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v5"
)

type HealthHandler struct {
	pool *pgxpool.Pool
}

func NewHealthHandler(pool *pgxpool.Pool) *HealthHandler {
	return &HealthHandler{pool: pool}
}

// is the process up?
func (h *HealthHandler) Live(c *echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

// can this process server traffic?
func (h *HealthHandler) Ready(c *echo.Context) error {
	ctx, cancel := context.WithTimeout(c.Request().Context(), 2*time.Second)
	defer cancel()

	if err := h.pool.Ping(ctx); err != nil {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{
			"status": "unavailable",
			"error":  "database unreachable",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "ready"})
}
