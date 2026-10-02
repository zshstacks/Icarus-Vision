package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	//ADS-B source

	AdsBPollsTotal = promauto.NewCounter(prometheus.CounterOpts{
		Name: "icarus_adsb_polls_total",
		Help: "Total OpenSky poll attempts.",
	})

	AdsBPollErrors = promauto.NewCounter(prometheus.CounterOpts{
		Name: "icarus_adsb_poll_errors_total",
		Help: "Total failed OpenSky polls.",
	})

	AdsBPollDuration = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "icarus_adsb_poll_duration_seconds",
		Help:    "Duration of a single OpenSky poll.",
		Buckets: prometheus.DefBuckets,
	})

	AdsBCreditsRemaining = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "icarus_adsb_credits_remaining",
		Help: "OpenSky daily credit budget remaining, from X-Rate-Limit-Remaining.",
	})

	TracksIngested = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "icarus_tracks_ingested_total",
		Help: "Total tracks successfully parsed and forwarded, by source.",
	}, []string{"source"})

	// Persistence

	DBWriteErrors = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "icarus_db_write_errors_total",
		Help: "Total database write failures, by operation.",
	}, []string{"op"})

	//WebSocket

	WSConnections = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "icarus_ws_connections",
		Help: "Current number of connected WebSocket clients.",
	})

	HubDropped = promauto.NewCounter(prometheus.CounterOpts{
		Name: "icarus_hub_dropped_total",
		Help: "Total events dropped because a client's send buffer was full.",
	})

	//HTTP

	HTTPRequests = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "icarus_http_requests_total",
		Help: "Total HTTP requests, by method, route template, and status.",
	}, []string{"method", "path", "status"})
)
