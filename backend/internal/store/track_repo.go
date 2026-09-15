package store

import (
	"context"
	"icarus-vision/internal/domain"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type TrackRepo struct {
	pool *pgxpool.Pool
}

func NewTrackRepo(pool *pgxpool.Pool) *TrackRepo {
	trackRepo := &TrackRepo{
		pool: pool,
	}

	return trackRepo
}

func (r *TrackRepo) UpsertLatest(ctx context.Context, t domain.Track) error {
	const q = `
		INSERT INTO tracks_latest (
			id, callsign, lat, lon, altitude, on_ground, speed, heading, vertical_rate, recorded_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10
		)
		ON CONFLICT (id) DO UPDATE SET
			callsign      = EXCLUDED.callsign,
			lat           = EXCLUDED.lat,
			lon           = EXCLUDED.lon,
			altitude      = EXCLUDED.altitude,
			on_ground     = EXCLUDED.on_ground,
			speed         = EXCLUDED.speed,
			heading       = EXCLUDED.heading,
			vertical_rate = EXCLUDED.vertical_rate,
			recorded_at   = EXCLUDED.recorded_at,
			updated_at    = now()
	`

	recordedAt := time.Unix(t.Timestamp, 0)

	_, err := r.pool.Exec(ctx, q,
		t.ID,
		t.Callsign,
		t.Lat,
		t.Lon,
		t.Altitude,
		t.OnGround,
		t.Speed,
		t.Heading,
		t.VerticalRate,
		recordedAt,
	)
	return err
}

func (r *TrackRepo) InsertPosition(ctx context.Context, t domain.Track) error {

	const q = `
		INSERT INTO track_positions (
			track_id, lat, lon, altitude, recorded_at
		) VALUES (
			$1, $2, $3, $4, $5
		)
	`

	recordedAt := time.Unix(t.Timestamp, 0)

	_, err := r.pool.Exec(ctx, q,
		t.ID,
		t.Lat,
		t.Lon,
		t.Altitude,
		recordedAt,
	)
	return err

}

// get all current track records from track_latest for the latest snapshot
func (r *TrackRepo) GetAllLatest(ctx context.Context) ([]domain.Track, error) {
	const q = `
		SELECT 
    id, 
    callsign, 
    lat, 
    lon, 
    altitude, 
    on_ground, 
    speed, 
    heading, 
    vertical_rate, 
    recorded_at 
FROM tracks_latest
WHERE recorded_at > now() - interval '5 minutes';
	`

	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tracks []domain.Track
	var recordedAt time.Time

	for rows.Next() {
		var t domain.Track

		err := rows.Scan(&t.ID, &t.Callsign, &t.Lat, &t.Lon, &t.Altitude, &t.OnGround, &t.Speed, &t.Heading, &t.VerticalRate, &recordedAt)
		if err != nil {
			return nil, err
		}
		t.Timestamp = recordedAt.Unix()
		tracks = append(tracks, t)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return tracks, nil
}
