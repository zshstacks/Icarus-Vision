package ws

import (
	"encoding/json"
	"icarus-vision/internal/domain"
)

type Hub struct {
	clients    map[*Client]struct{}
	broadcast  chan *domain.Event
	register   chan *Client
	unregister chan *Client
}

func NewHub() *Hub {
	hub := Hub{
		clients:    make(map[*Client]struct{}),
		broadcast:  make(chan *domain.Event),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}

	return &hub
}

func (h *Hub) Run() {

	for {
		select {
		case client := <-h.register:
			h.clients[client] = struct{}{}
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				close(client.send)
				delete(h.clients, client)
			}
		case event := <-h.broadcast:
			data, err := json.Marshal(event)
			if err != nil {
				continue
			}

			for client := range h.clients {
				select {
				case client.send <- data:
				default:
					if _, ok := h.clients[client]; ok {
						close(client.send)
						delete(h.clients, client)
					}
				}
			}
		}
	}

}
