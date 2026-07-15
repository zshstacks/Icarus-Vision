package hub

import (
	"icarus-vision/internal/pb"
	"icarus-vision/internal/ws"
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
