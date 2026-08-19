package ws

import (
	"context"

	"github.com/coder/websocket"
	"github.com/labstack/echo/v5"
)

type Handler struct {
	hub *Hub
}

func (h *Handler) Upgrade(c echo.Context) error {
	conn, err := websocket.Accept(c.Response(), c.Request(), nil)
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
