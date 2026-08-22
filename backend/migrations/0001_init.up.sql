-- CHECK LATER THIS SHIT
CREATE EXTENSION IF NOT EXISTS postgis;

--latest position per aircraft
CREATE TABLE tracks_latest (
 id              TEXT PRIMARY KEY, -- ICAO24
 callsign        TEXT,
 lat             DOUBLE PRECISION NOT NULL,
 lon             DOUBLE PRECISION NOT NULL,
 altitude        DOUBLE PRECISION, -- meters
 on_ground       BOOLEAN NOT NULL DEFAULT false,
 speed           DOUBLE PRECISION, -- m/s
 heading         DOUBLE PRECISION, -- degrees 0-360
 vertical_rate   DOUBLE PRECISION, -- m/s
 recorded_at     TIMESTAMPTZ NOT NULL, -- position time from source
 updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(), -- last write time


 geom            geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lon, lat), 4326)) STORED
);


CREATE INDEX tracks_latest_geom_idx ON tracks_latest USING GIST (geom);


CREATE TABLE track_positions (
id              BIGSERIAL PRIMARY KEY,
track_id        TEXT NOT NULL,  -- ICAO24
lat             DOUBLE PRECISION NOT NULL,
lon             DOUBLE PRECISION NOT NULL,
altitude        DOUBLE PRECISION,   -- meters
recorded_at     TIMESTAMPTZ NOT NULL,   -- position time from source

geom            geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lon, lat), 4326)) STORED
);


-- give me this aircrafts trail for the last N minutes
CREATE INDEX track_positions_track_id_recorded_at_idx
    ON track_positions (track_id, recorded_at);

-- history
CREATE INDEX track_positions_geom_idx
    ON track_positions USING GIST (geom);