package broadcaster

import (
	"context"
	"icarus-vision/internal/domain"
	"icarus-vision/internal/store"
	"icarus-vision/internal/transport/ws"
	"log"
)

type Broadcaster struct {
	tracks    <-chan []domain.Track
	hub       *ws.Hub
	source    string
	trackRepo *store.TrackRepo
}

func NewBroadcaster(tracks <-chan []domain.Track, hub *ws.Hub, source string, trackRepo *store.TrackRepo) *Broadcaster {
	b := &Broadcaster{
		tracks:    tracks,
		hub:       hub,
		source:    source,
		trackRepo: trackRepo,
	}

	return b
}

func (b *Broadcaster) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case tracks := <-b.tracks:
			event := &domain.Event{
				Type:   "track_update",
				Source: b.source,
				Data:   tracks,
			}

			b.hub.Broadcast <- event

			for _, row := range tracks {
				if err := b.trackRepo.UpsertLatest(ctx, row); err != nil {
					log.Printf("UpsertLatest error: %v", err)
				}

				if err := b.trackRepo.InsertPosition(ctx, row); err != nil {
					log.Printf("InsertPosition error: %v", err)
				}
			}

		}

	}

}
