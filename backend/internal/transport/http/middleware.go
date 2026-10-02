package http

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"icarus-vision/internal/metrics"

	"github.com/labstack/echo/v5"
)

const RequestIDHeader = "X-Request-Id"

func RequestID() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			id := c.Request().Header.Get(RequestIDHeader)
			if id == "" {
				id = newRequestID()
			}
			c.Set("request_id", id)
			c.Response().Header().Set(RequestIDHeader, id)
			return next(c)
		}
	}
}

func newRequestID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "unknown"
	}
	return hex.EncodeToString(b)
}

func resolveStatus(c *echo.Context, err error) int {
	if err != nil {
		if coder, ok := err.(echo.HTTPStatusCoder); ok {
			if code := coder.StatusCode(); code != 0 {
				return code
			}
		}
		return http.StatusInternalServerError
	}

	if resp, unwrapErr := echo.UnwrapResponse(c.Response()); unwrapErr == nil && resp.Status != 0 {
		return resp.Status
	}

	return http.StatusOK
}

// replaces Echo middleware.RequestLogger
func SlogRequestLogger() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			start := time.Now()

			err := next(c)

			req := c.Request()
			status := resolveStatus(c, err)

			level := slog.LevelInfo
			switch {
			case status >= 500:
				level = slog.LevelError
			case status >= 400:
				level = slog.LevelWarn
			}

			attrs := []any{
				"method", req.Method,
				"path", req.URL.Path,
				"status", status,
				"duration_ms", time.Since(start).Milliseconds(),
				"remote_addr", req.RemoteAddr,
			}
			if id, ok := c.Get("request_id").(string); ok && id != "" {
				attrs = append(attrs, "request_id", id)
			}
			if err != nil {
				attrs = append(attrs, "error", err.Error())
			}

			slog.Log(req.Context(), level, "http request", attrs...)
			return err
		}
	}
}

// increments the request counter
func MetricsMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			err := next(c)

			path := c.Path()
			if path == "" {
				path = "unmatched"
			}

			status := resolveStatus(c, err)

			metrics.HTTPRequests.WithLabelValues(
				c.Request().Method,
				path,
				strconv.Itoa(status),
			).Inc()

			return err
		}
	}
}
