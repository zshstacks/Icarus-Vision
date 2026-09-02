package adsb

import (
	"context"
	"icarus-vision/internal/domain"
	"log"
	"time"
)

type Worker struct {
	client *ClientManager
	ids    map[string]struct{}
}

func NewWorker(client *ClientManager) *Worker {
	w := &Worker{
		client: client,
		ids:    make(map[string]struct{}),
	}
	return w
}

func (w *Worker) Name() string {
	return "adsb"
}

func (w *Worker) Start(ctx context.Context, out chan<- []domain.Track, outRemoved chan<- []string) error {
	ticker := time.NewTicker(120 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			states, err := w.client.FetchStates(ctx)
			if err != nil {
				log.Printf("Worker Start(): fetch states -  %v", err)
				continue
			}

			total := len(states.States)
			rejected := 0
			var tracks []domain.Track

			for _, row := range states.States {
				track, err := rowToTrack(row)

				if err != nil {
					log.Printf("Worker Start(): rowToTrack -  %v", err)
					rejected++
					continue
				}
				tracks = append(tracks, track)
			}

			currentIDs := make(map[string]struct{})
			for _, t := range tracks {
				currentIDs[t.ID] = struct{}{}
			}

			var removedIDs []string
			for id := range w.ids {
				if _, ok := currentIDs[id]; !ok { //is id present in currentIDs, if not it means aircraft disappeared this tick
					removedIDs = append(removedIDs, id)
				}
			}
			w.ids = currentIDs

			if len(removedIDs) > 0 {
				outRemoved <- removedIDs
			}

			if len(tracks) > 0 {
				out <- tracks
			}

			//total vs rejected per tick(perc%)
			accepted := total - rejected
			pct := 0.0
			if total > 0 {
				pct = float64(rejected) / float64(total) * 100
			}
			log.Printf("Worker Start(): tick stats - total: %d, accepted: %d, rejected: %d (%.1f%% rejected)",
				total, accepted, rejected, pct)

		}
	}
}
