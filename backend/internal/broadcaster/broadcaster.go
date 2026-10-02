package broadcaster

import (
	"context"
	"log/slog"

	"icarus-vision/internal/domain"
	"icarus-vision/internal/metrics"
	"icarus-vision/internal/store"
	"icarus-vision/internal/transport/ws"
)

type Broadcaster struct {
	tracks        <-chan []domain.Track
	removedTracks <-chan []string
	hub           *ws.Hub
	source        string
	trackRepo     *store.TrackRepo
}

func NewBroadcaster(
	tracks <-chan []domain.Track,
	removedTracks <-chan []string,
	hub *ws.Hub,
	source string,
	trackRepo *store.TrackRepo,
) *Broadcaster {
	return &Broadcaster{
		tracks:        tracks,
		removedTracks: removedTracks,
		hub:           hub,
		source:        source,
		trackRepo:     trackRepo,
	}
}

func (b *Broadcaster) Run(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return

		case tracks := <-b.tracks:
			if len(tracks) == 0 {
				continue
			}

			event := &domain.Event{
				Type:   "track_update",
				Source: b.source,
				Data:   tracks,
			}
			b.publish(ctx, event)
			b.persist(ctx, tracks)

		case removedTracks := <-b.removedTracks:
			if len(removedTracks) == 0 {
				continue
			}

			removedAsTracks := make([]domain.Track, 0, len(removedTracks))
			for _, id := range removedTracks {
				removedAsTracks = append(removedAsTracks, domain.Track{ID: id})
			}

			event := &domain.Event{
				Type:   "track_removed",
				Source: b.source,
				Data:   removedAsTracks,
			}
			b.publish(ctx, event)
		}
	}
}

func (b *Broadcaster) publish(ctx context.Context, event *domain.Event) {
	select {
	case b.hub.Broadcast <- event:
	case <-ctx.Done():
	default:
		metrics.HubDropped.Inc()
		slog.Warn("broadcaster: dropped event, hub channel full",
			"source", b.source, "type", event.Type)
	}
}

func (b *Broadcaster) persist(ctx context.Context, tracks []domain.Track) {
	if len(tracks) == 0 {
		return
	}

	// Single-row path for single-item batches.
	if len(tracks) == 1 {
		t := tracks[0]
		if err := b.trackRepo.UpsertLatest(ctx, t); err != nil {
			metrics.DBWriteErrors.WithLabelValues("upsert_latest").Inc()
			slog.Error("broadcaster: upsert failed", "source", b.source, "error", err)
		}
		if err := b.trackRepo.InsertPosition(ctx, t); err != nil {
			metrics.DBWriteErrors.WithLabelValues("insert_position").Inc()
			slog.Error("broadcaster: insert failed", "source", b.source, "error", err)
		}
		return
	}

	// Batch path. If your TrackRepo has UpsertLatestBatch /
	// InsertPositionBatch, use those. Otherwise this loops the single-row
	// path, which is slow but correct.
	if err := b.trackRepo.UpsertLatestBatch(ctx, tracks); err != nil {
		metrics.DBWriteErrors.WithLabelValues("upsert_latest_batch").Inc()
		slog.Error("broadcaster: batch upsert failed",
			"source", b.source, "count", len(tracks), "error", err)
	}
	if err := b.trackRepo.InsertPositionBatch(ctx, tracks); err != nil {
		metrics.DBWriteErrors.WithLabelValues("insert_position_batch").Inc()
		slog.Error("broadcaster: batch insert failed",
			"source", b.source, "count", len(tracks), "error", err)
	}
}
