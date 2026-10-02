package adsb

import (
	"context"
	"log/slog"
	"time"

	"icarus-vision/internal/domain"
	"icarus-vision/internal/metrics"
)

type Worker struct {
	client *ClientManager
	ids    map[string]struct{}
}

func NewWorker(client *ClientManager) *Worker {
	return &Worker{
		client: client,
		ids:    make(map[string]struct{}),
	}
}

func (w *Worker) Name() string { return "adsb" }

func (w *Worker) Start(ctx context.Context, out chan<- []domain.Track, outRemoved chan<- []string) error {
	ticker := time.NewTicker(120 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			metrics.AdsBPollsTotal.Inc()
			start := time.Now()

			states, err := w.client.FetchStates(ctx)
			metrics.AdsBPollDuration.Observe(time.Since(start).Seconds())

			if err != nil {
				metrics.AdsBPollErrors.Inc()
				slog.Warn("adsb: fetch failed", "error", err)
				continue
			}

			total := len(states.States)
			rejected := 0
			var tracks []domain.Track

			for _, row := range states.States {
				track, err := rowToTrack(row)
				if err != nil {
					rejected++
					continue
				}
				tracks = append(tracks, track)
			}

			currentIDs := make(map[string]struct{}, len(tracks))
			for _, t := range tracks {
				currentIDs[t.ID] = struct{}{}
			}

			var removedIDs []string
			for id := range w.ids {
				if _, ok := currentIDs[id]; !ok {
					removedIDs = append(removedIDs, id)
				}
			}
			w.ids = currentIDs

			if len(removedIDs) > 0 {
				select {
				case outRemoved <- removedIDs:
				case <-ctx.Done():
					return ctx.Err()
				}
			}

			if len(tracks) > 0 {
				select {
				case out <- tracks:
				case <-ctx.Done():
					return ctx.Err()
				}
			}

			metrics.TracksIngested.WithLabelValues("adsb").Add(float64(len(tracks)))

			accepted := total - rejected
			pct := 0.0
			if total > 0 {
				pct = float64(rejected) / float64(total) * 100
			}
			slog.Info("adsb: tick",
				"total", total,
				"accepted", accepted,
				"rejected", rejected,
				"rejected_pct", pct,
				"removed", len(removedIDs),
			)
		}
	}
}
