package adsb

import (
	"context"
	"icarus-vision/internal/domain"
	"log"
	"time"
)

type Worker struct {
	client *ClientManager
}

func NewWorker(client *ClientManager) *Worker {
	w := &Worker{
		client: client,
	}
	return w
}

func (w *Worker) Name() string {
	return "adsb"
}

func (w *Worker) Start(ctx context.Context, out chan<- []domain.Track) error {
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
