package store

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func RunRetention(ctx context.Context, pool *pgxpool.Pool, retentionWindow time.Duration) error {
	cutoff := time.Now().UTC().Add(-retentionWindow)

	q := `DELETE FROM track_positions WHERE recorded_at < $1`

	_, err := pool.Exec(ctx, q, cutoff)
	if err != nil {
		return fmt.Errorf("RunRetention: %w", err)
	}

	return nil
}

func RunRetentionLoop(ctx context.Context, pool *pgxpool.Pool, interval time.Duration, retentionWindow time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	err := RunRetention(ctx, pool, retentionWindow)
	if err != nil {
		log.Printf("RunRetention on startup: %v", err)
	}

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			err := RunRetention(ctx, pool, retentionWindow)
			if err != nil {
				log.Printf("RunRetentionLoop: %v", err)
			}
		}
	}

}
