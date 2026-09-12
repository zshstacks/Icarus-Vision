package ws

import (
	"context"

	"github.com/coder/websocket"
	"github.com/labstack/echo/v5"
)

type Handler struct {
	hub *Hub
	ctx context.Context
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

	select {
	case h.hub.register <- &client:

	case <-h.ctx.Done():
		err := conn.Close(websocket.StatusNormalClosure, "connection closed")
		if err != nil {
			return err
		}
		return h.ctx.Err()
	}

	go client.WritePump()
	go client.ReadPump(h.ctx)

	return nil
}

func NewHandler(hub *Hub, ctx context.Context) *Handler {
	return &Handler{hub: hub, ctx: ctx}
}
