package broadcaster

import (
	"context"
	"icarus-vision/internal/domain"
	"icarus-vision/internal/transport/ws"
)

type Broadcaster struct {
	tracks <-chan domain.Track
	hub    *ws.Hub
	source string
}

func NewBroadcaster(tracks <-chan domain.Track, hub *ws.Hub, source string) *Broadcaster {
	b := &Broadcaster{
		tracks: tracks,
		hub:    hub,
		source: source,
	}

	return b
}

func (b *Broadcaster) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case track := <-b.tracks:
			event := &domain.Event{
				Type:   "track_update",
				Source: b.source,
				Data:   track,
			}
			b.hub.Broadcast <- event
		}
	}
}
