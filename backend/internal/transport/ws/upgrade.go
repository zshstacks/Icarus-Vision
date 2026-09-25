package ws

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"

	"icarus-vision/internal/auth"

	"github.com/coder/websocket"
	"github.com/labstack/echo/v5"
)

type Handler struct {
	hub       *Hub
	ctx       context.Context
	jwtSecret string
}

func NewHandler(hub *Hub, ctx context.Context, jwtSecret string) *Handler {
	return &Handler{hub: hub, ctx: ctx, jwtSecret: jwtSecret}
}

func (h *Handler) Upgrade(c *echo.Context) error {
	userID, err := h.authenticate(c)
	if err != nil {

		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
	}

	opts := websocket.AcceptOptions{
		OriginPatterns: []string{"localhost:8080", "localhost:5173"},
	}
	conn, err := websocket.Accept(c.Response(), c.Request(), &opts)
	if err != nil {
		return err
	}

	client := Client{
		conn: conn,
		hub:  h.hub,
		send: make(chan []byte, 32),
	}

	select {
	case h.hub.register <- &client:
	case <-h.ctx.Done():
		_ = conn.Close(websocket.StatusNormalClosure, "server shutting down")
		return h.ctx.Err()
	}

	log.Printf("ws: client connected (user=%s)", userID)

	go client.WritePump()
	go client.ReadPump(h.ctx)

	return nil
}

// validates the access-token cookie  or authorization
func (h *Handler) authenticate(c *echo.Context) (string, error) {
	tokenString := ""

	if cookie, err := c.Cookie("access_token"); err == nil && cookie.Value != "" {
		tokenString = cookie.Value
	} else if authHeader := c.Request().Header.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
		tokenString = strings.TrimPrefix(authHeader, "Bearer ")
	}

	if tokenString == "" {
		return "", errors.New("missing token")
	}

	return auth.ParseAccessToken(tokenString, h.jwtSecret)
}
