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

func (w *Worker) Start(ctx context.Context, out chan<- domain.Track) error {
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

			for _, row := range states.States {
				track, err := rowToTrack(row)
				if err != nil {
					log.Printf("Worker Start(): rowToTrack -  %v", err)
					continue
				}
				out <- track
			}

		}
	}
}
