package hub

import (
	"icarus-vision/internal/pb"
	"icarus-vision/internal/ws"

	"google.golang.org/protobuf/proto"
)

type Hub struct {
	clients    map[*ws.Client]struct{}
	broadcast  chan *pb.AttackEvent
	register   chan *ws.Client
	unregister chan *ws.Client
}

func NewHub() *Hub {
	hub := Hub{
		clients:    make(map[*ws.Client]struct{}),
		broadcast:  make(chan *pb.AttackEvent, 100),
		register:   make(chan *ws.Client),
		unregister: make(chan *ws.Client),
	}
	return &hub
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = struct{}{}
		case client := <-h.unregister:
			delete(h.clients, client)
		case event := <-h.broadcast:
			data, err := proto.Marshal(event)
			if err != nil {
				continue
			}

			for client := range h.clients {
				select {
				case client.Send <- data:
				default:
					delete(h.clients, client)
				}
			}
		}
	}
}
