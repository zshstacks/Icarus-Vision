package http

import (
	"icarus-vision/internal/store"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v5"
)

const (
	defaultTrailMinutes = 60
	maxTrailMinutes     = 1440 //24h, matches retention
)

type TracksHandler struct {
	trackRepo *store.TrackRepo
}

func NewTracksHandler(trackRepo *store.TrackRepo) *TracksHandler {
	return &TracksHandler{trackRepo: trackRepo}
}

func (h *TracksHandler) GetTracks(c *echo.Context) error {
	tracks, err := h.trackRepo.GetAllLatest(c.Request().Context())
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to fetch tracks"})
	}

	return c.JSON(http.StatusOK, tracks)
}

type trailFeature struct {
	Type       string          `json:"type"`
	Geometry   trailGeometry   `json:"geometry"`
	Properties trailProperties `json:"properties"`
}

type trailGeometry struct {
	Type        string       `json:"type"`
	Coordinates [][2]float64 `json:"coordinates"`
}

type trailProperties struct {
	ID         string           `json:"id"`
	PointCount int              `json:"point_count"`
	From       int64            `json:"from"`
	To         int64            `json:"to"`
	Telemetry  []TelemetryPoint `json:"telemetry"`
}

type TelemetryPoint struct {
	Timestamp int64    `json:"t"`
	Altitude  *float64 `json:"alt"`
}

type trailCollection struct {
	Type     string         `json:"type"`
	Features []trailFeature `json:"features"`
}

func emptyTrail() trailCollection {
	return trailCollection{Type: "FeatureCollection", Features: []trailFeature{}}
}

func (h *TracksHandler) GetHistory(c *echo.Context) error {
	id := c.Param("id")
	if id == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing track id"})
	}

	minutes := defaultTrailMinutes
	if raw := c.QueryParam("minutes"); raw != "" {
		v, err := strconv.Atoi(raw)
		if err != nil || v <= 0 || v > maxTrailMinutes {
			return c.JSON(http.StatusBadRequest, map[string]string{"error": "minutes must be an integer between 1 and 1440"})
		}
		minutes = v
	}
	positions, err := h.trackRepo.GetTrail(c.Request().Context(), id, minutes)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to fetch history"})
	}

	if len(positions) < 2 {
		return c.JSON(http.StatusOK, emptyTrail())
	}
	coords := make([][2]float64, len(positions))
	for i, p := range positions {
		coords[i] = [2]float64{p.Lon, p.Lat}
	}

	telemetry := make([]TelemetryPoint, 0, len(positions))
	for _, p := range positions {
		telemetry = append(telemetry, TelemetryPoint{
			Timestamp: p.Timestamp,
			Altitude:  p.Altitude,
		})
	}

	feature := trailFeature{
		Type: "Feature",
		Geometry: trailGeometry{
			Type:        "LineString",
			Coordinates: coords,
		},
		Properties: trailProperties{
			ID:         id,
			PointCount: len(positions),
			From:       positions[0].Timestamp,
			To:         positions[len(positions)-1].Timestamp,
			Telemetry:  telemetry,
		},
	}
	return c.JSON(http.StatusOK, trailCollection{
		Type:     "FeatureCollection",
		Features: []trailFeature{feature},
	})
}
