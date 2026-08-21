package ingest

import (
	"context"
	"icarus-vision/internal/domain"
)

type Source interface {
	Name() string
	Start(ctx context.Context, out chan<- domain.Track) error
}
