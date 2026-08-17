package ws

import (
	"context"
	"log"
	"time"

	"github.com/coder/websocket"
)

type Client struct {
	conn *websocket.Conn
	send chan []byte
	hub  *Hub
}

func (c *Client) ReadPump(ctx context.Context) {
	for {
		_, _, err := c.conn.Read(ctx)
		if err != nil {
			log.Printf("ReadPump error: %v", err)
			c.hub.unregister <- c
			_ = c.conn.Close(websocket.StatusNormalClosure, "")
			return
		}
	}
}

func (c *Client) WritePump() {
	defer func() {
		_ = c.conn.Close(websocket.StatusNormalClosure, "")
	}()

	for data := range c.send {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		err := c.conn.Write(ctx, websocket.MessageText, data)
		cancel()
		if err != nil {
			log.Printf("WritePump error: %v", err)
			c.hub.unregister <- c
			return
		}
	}

}
