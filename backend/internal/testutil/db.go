package testutil

import (
	"context"
	"icarus-vision/internal/store"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewTestPool returns a pool against TEST_DATABASE_URL with migrations
func NewTestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping DB-backed test")
	}

	// Resolve repo root from this file's location: internal/testutil/db.go.
	_, file, _, _ := runtime.Caller(0)
	root := filepath.Dir(filepath.Dir(filepath.Dir(file)))
	migrationsPath := filepath.Join(root, "migrations")

	if err := store.RunMigration(url, migrationsPath); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatalf("pool: %v", err)
	}
	t.Cleanup(pool.Close)

	_, err = pool.Exec(ctx,
		`TRUNCATE users, refresh_tokens, tracks_latest, track_positions RESTART IDENTITY CASCADE`)
	if err != nil {
		t.Fatalf("truncate: %v", err)
	}

	return pool
}
