package http

import (
	"icarus-vision/internal/store"
	"net/http"

	"github.com/labstack/echo/v5"
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
