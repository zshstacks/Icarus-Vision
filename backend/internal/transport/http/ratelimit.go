package http

import (
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/labstack/echo/v5"
	"golang.org/x/time/rate"
)

//the bucket key comes from remoteaddr (the actual TCP peer, not spoofable), buckets are in-memory only, a restart clears them

type loginLimiter struct {
	mu       sync.Mutex
	limiters map[string]*rate.Limiter
	lastSeen map[string]time.Time

	r rate.Limit
	b int

	trusted []*net.IPNet
}

func newLoginLimiter(r rate.Limit, b int, trustedCIDRs []string) *loginLimiter {
	trusted, err := parseCIDRs(trustedCIDRs)
	if err != nil {
		log.Fatalf("ratelimit: invalid TRUSTED_PROXIES: %v", err)
	}

	l := &loginLimiter{
		limiters: make(map[string]*rate.Limiter),
		lastSeen: make(map[string]time.Time),
		r:        r,
		b:        b,
		trusted:  trusted,
	}
	go l.sweepLoop()
	return l
}

func parseCIDRs(raw []string) ([]*net.IPNet, error) {
	var out []*net.IPNet
	for _, s := range raw {
		if !strings.Contains(s, "/") {
			if ip := net.ParseIP(s); ip != nil {
				if ip.To4() != nil {
					s += "/32"
				} else {
					s += "/128"
				}
			}
		}
		_, ipnet, err := net.ParseCIDR(s)
		if err != nil {
			return nil, err
		}
		out = append(out, ipnet)
	}
	return out, nil
}

func (l *loginLimiter) isTrustedPeer(ip net.IP) bool {
	for _, n := range l.trusted {
		if n.Contains(ip) {
			return true
		}
	}
	return false
}

// clientIP returns the key the limiter buckets on.
//  1. If remoteaddr isnt a trusted proxy -> use it directly
//  2. Otherwise, walk x-forwarded-for from right to left, skipping any entries that are themselves trusted, first untrusted entry wins
//  3. If XFF is missing or malformed -> fall back to remoteaddr

func (l *loginLimiter) clientIP(c *echo.Context) string {
	peerStr, _, err := net.SplitHostPort(c.Request().RemoteAddr)
	if err != nil {

		return c.Request().RemoteAddr
	}

	peer := net.ParseIP(peerStr)
	if peer == nil || !l.isTrustedPeer(peer) {
		return peerStr
	}

	xff := c.Request().Header.Get("X-Forwarded-For")
	if xff == "" {
		return peerStr
	}

	parts := strings.Split(xff, ",")
	for i := len(parts) - 1; i >= 0; i-- {
		candidate := net.ParseIP(strings.TrimSpace(parts[i]))
		if candidate == nil {
			continue
		}
		if !l.isTrustedPeer(candidate) {
			return candidate.String()
		}
	}

	return peerStr
}

func (l *loginLimiter) allow(ip string) bool {
	l.mu.Lock()
	lim, ok := l.limiters[ip]
	if !ok {
		lim = rate.NewLimiter(l.r, l.b)
		l.limiters[ip] = lim
	}
	l.lastSeen[ip] = time.Now()
	l.mu.Unlock()

	return lim.Allow()
}

func (l *loginLimiter) sweepLoop() {
	t := time.NewTicker(10 * time.Minute)
	defer t.Stop()

	for range t.C {
		cutoff := time.Now().Add(-30 * time.Minute)

		l.mu.Lock()
		for ip, seen := range l.lastSeen {
			if seen.Before(cutoff) {
				delete(l.lastSeen, ip)
				delete(l.limiters, ip)
			}
		}
		l.mu.Unlock()
	}
}

func (l *loginLimiter) middleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			if !l.allow(l.clientIP(c)) {
				c.Response().Header().Set("Retry-After", "60")
				return c.JSON(http.StatusTooManyRequests, map[string]string{
					"error": "too many login attempts, try again later",
				})
			}
			return next(c)
		}
	}
}
