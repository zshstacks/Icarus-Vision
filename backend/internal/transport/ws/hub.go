package ws

import (
	"context"
	"encoding/json"
	"log/slog"

	"icarus-vision/internal/domain"
	"icarus-vision/internal/metrics"
)

const broadcastBuffer = 64

type Hub struct {
	clients    map[*Client]struct{}
	Broadcast  chan *domain.Event
	register   chan *Client
	unregister chan *Client
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]struct{}),
		Broadcast:  make(chan *domain.Event, broadcastBuffer),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return

		case client := <-h.register:
			h.clients[client] = struct{}{}
			metrics.WSConnections.Inc()

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				close(client.send)
				delete(h.clients, client)
				metrics.WSConnections.Dec()
			}

		case event := <-h.Broadcast:
			data, err := json.Marshal(event)
			if err != nil {
				slog.Error("hub: marshal failed", "error", err, "type", event.Type)
				continue
			}

			for client := range h.clients {
				select {
				case client.send <- data:
				default:
					close(client.send)
					delete(h.clients, client)
					metrics.WSConnections.Dec()
					metrics.HubDropped.Inc()
					slog.Warn("hub: evicted slow client")
				}
			}
		}
	}
}
