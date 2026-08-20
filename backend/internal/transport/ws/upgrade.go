package ws

import (
	"context"

	"github.com/coder/websocket"
	"github.com/labstack/echo/v5"
)

type Handler struct {
	hub *Hub
}

func (h *Handler) Upgrade(c *echo.Context) error {
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
		send: make(chan []byte, 32), //buffered (async, no ruin)
	}

	h.hub.register <- &client

	go client.WritePump()
	go client.ReadPump(context.Background())

	return nil
}

func NewHandler(hub *Hub) *Handler {
	return &Handler{hub: hub}
}
