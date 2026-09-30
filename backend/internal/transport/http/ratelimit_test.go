package http

import (
	"net/http/httptest"
	"testing"
	"time"

	"github.com/labstack/echo/v5"
	"golang.org/x/time/rate"
)

func fakeContext(remoteAddr, xff string) *echo.Context {
	e := echo.New()
	req := httptest.NewRequest("POST", "/auth/login", nil)
	req.RemoteAddr = remoteAddr
	if xff != "" {
		req.Header.Set("X-Forwarded-For", xff)
	}
	rec := httptest.NewRecorder()
	return e.NewContext(req, rec)
}

func TestClientIP(t *testing.T) {
	cases := []struct {
		name       string
		trusted    []string
		remoteAddr string
		xff        string
		want       string
	}{
		{
			name:       "no trusted proxies, no xff",
			trusted:    nil,
			remoteAddr: "203.0.113.5:1234",
			want:       "203.0.113.5",
		},
		{
			// The spoofing fix: XFF is present but there is no trusted
			// proxy in front, so it must be ignored.
			name:       "no trusted proxies, xff ignored",
			trusted:    nil,
			remoteAddr: "203.0.113.5:1234",
			xff:        "10.0.0.99",
			want:       "203.0.113.5",
		},
		{
			// Attacker sets XFF on a direct connection while a proxy is
			// configured - their peer address isnt the proxy, so the
			// header is still untrusted.
			name:       "untrusted peer with spoofed xff",
			trusted:    []string{"10.0.0.0/8"},
			remoteAddr: "203.0.113.5:1234",
			xff:        "10.0.0.99",
			want:       "203.0.113.5",
		},
		{
			name:       "trusted proxy, single xff",
			trusted:    []string{"127.0.0.1/32"},
			remoteAddr: "127.0.0.1:54321",
			xff:        "203.0.113.5",
			want:       "203.0.113.5",
		},
		{
			name:       "trusted proxy, multi-hop xff, rightmost untrusted wins",
			trusted:    []string{"127.0.0.1/32", "10.0.0.0/8"},
			remoteAddr: "127.0.0.1:54321",
			xff:        "203.0.113.5, 10.0.0.1",
			want:       "203.0.113.5",
		},
		{
			name:       "trusted proxy, all xff entries trusted — fall back to peer",
			trusted:    []string{"127.0.0.1/32", "10.0.0.0/8"},
			remoteAddr: "127.0.0.1:54321",
			xff:        "10.0.0.1, 10.0.0.2",
			want:       "127.0.0.1",
		},
		{
			name:       "trusted proxy, malformed xff — fall back to peer",
			trusted:    []string{"127.0.0.1/32"},
			remoteAddr: "127.0.0.1:54321",
			xff:        "not-an-ip",
			want:       "127.0.0.1",
		},
		{
			name:       "trusted proxy, empty xff",
			trusted:    []string{"127.0.0.1/32"},
			remoteAddr: "127.0.0.1:54321",
			xff:        "",
			want:       "127.0.0.1",
		},
		{
			name:       "bare IP trusted list is normalized to /32",
			trusted:    []string{"127.0.0.1"},
			remoteAddr: "127.0.0.1:54321",
			xff:        "203.0.113.5",
			want:       "203.0.113.5",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			l := newLoginLimiter(rate.Every(time.Minute), 5, tc.trusted)
			c := fakeContext(tc.remoteAddr, tc.xff)
			got := l.clientIP(c)
			if got != tc.want {
				t.Fatalf("want %q, got %q", tc.want, got)
			}
		})
	}
}

func TestLoginLimiter_Allow(t *testing.T) {

	l := newLoginLimiter(rate.Every(20*time.Millisecond), 2, nil)

	if !l.allow("1.2.3.4") {
		t.Fatal("first attempt should be allowed")
	}
	if !l.allow("1.2.3.4") {
		t.Fatal("second attempt should be allowed")
	}
	if l.allow("1.2.3.4") {
		t.Fatal("third attempt should be denied (bucket empty)")
	}

	if !l.allow("5.6.7.8") {
		t.Fatal("other IP should not be affected by first IP's exhaustion")
	}

	time.Sleep(30 * time.Millisecond)
	if !l.allow("1.2.3.4") {
		t.Fatal("expected refill to allow one more attempt")
	}
}
