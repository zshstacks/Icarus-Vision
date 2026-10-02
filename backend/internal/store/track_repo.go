package store

import (
	"context"
	"icarus-vision/internal/domain"
	"time"

	"github.com/jackc/pgx/v5"
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

// oldes first, plane that sit on the ground can produce same timestamp across two polls
func (r *TrackRepo) GetTrail(ctx context.Context, trackID string, minutes int) ([]domain.Position, error) {
	const q = `SELECT DISTINCT lat, lon, altitude, recorded_at
			FROM track_positions
			WHERE track_id = $1
			  AND recorded_at > now() - ($2::int * interval '1 minute')
			ORDER BY recorded_at ASC`

	rows, err := r.pool.Query(ctx, q, trackID, minutes)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var positions []domain.Position
	for rows.Next() {
		var (
			p          domain.Position
			recordedAt time.Time
		)

		if err := rows.Scan(&p.Lat, &p.Lon, &p.Altitude, &recordedAt); err != nil {
			return nil, err
		}
		p.Timestamp = recordedAt.Unix()
		positions = append(positions, p)
	}
	return positions, rows.Err()
}

func (r *TrackRepo) UpsertLatestBatch(ctx context.Context, tracks []domain.Track) error {
	if len(tracks) == 0 {
		return nil
	}

	const q = `
		INSERT INTO tracks_latest (
			id, callsign, lat, lon, altitude, on_ground, speed, heading, vertical_rate, recorded_at
		)
		SELECT * FROM UNNEST(
			$1::text[], $2::text[], $3::float8[], $4::float8[], $5::float8[],
			$6::bool[], $7::float8[], $8::float8[], $9::float8[], $10::timestamptz[]
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

	n := len(tracks)
	ids := make([]string, n)
	callsigns := make([]string, n)
	lats := make([]float64, n)
	lons := make([]float64, n)
	alts := make([]*float64, n)
	grounded := make([]bool, n)
	speeds := make([]*float64, n)
	headings := make([]*float64, n)
	verticals := make([]*float64, n)
	recorded := make([]time.Time, n)

	for i, t := range tracks {
		ids[i] = t.ID
		callsigns[i] = t.Callsign
		lats[i] = t.Lat
		lons[i] = t.Lon
		alts[i] = t.Altitude
		grounded[i] = t.OnGround
		speeds[i] = t.Speed
		headings[i] = t.Heading
		verticals[i] = t.VerticalRate
		recorded[i] = time.Unix(t.Timestamp, 0)
	}

	_, err := r.pool.Exec(ctx, q,
		ids, callsigns, lats, lons, alts,
		grounded, speeds, headings, verticals, recorded,
	)
	return err
}

func (r *TrackRepo) InsertPositionBatch(ctx context.Context, tracks []domain.Track) error {
	if len(tracks) == 0 {
		return nil
	}

	rows := make([][]any, len(tracks))
	for i, t := range tracks {
		rows[i] = []any{
			t.ID,
			t.Lat,
			t.Lon,
			t.Altitude,
			time.Unix(t.Timestamp, 0),
		}
	}

	_, err := r.pool.CopyFrom(
		ctx,
		pgx.Identifier{"track_positions"},
		[]string{"track_id", "lat", "lon", "altitude", "recorded_at"},
		pgx.CopyFromRows(rows),
	)
	return err
}
