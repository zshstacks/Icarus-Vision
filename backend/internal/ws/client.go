package ws

import "github.com/coder/websocket"

type Client struct {
	conn *websocket.Conn
	send chan []byte
}
