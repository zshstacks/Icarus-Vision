package auth_test

import (
	"context"
	"testing"
	"time"

	"icarus-vision/internal/auth"
	"icarus-vision/internal/config"
	"icarus-vision/internal/testutil"
)

func testJWTConfig() config.JWTConfig {
	return config.JWTConfig{
		Secret:          "test-secret-not-for-production",
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 24 * time.Hour,
		SecureCookie:    false,
	}
}

func newTestService(t *testing.T) (*auth.AuthService, context.Context) {
	t.Helper()
	pool := testutil.NewTestPool(t)
	repo := auth.NewAuthRepo(pool)
	svc := auth.NewAuthService(repo, testJWTConfig())
	return svc, context.Background()
}

func TestLogin_InvalidCredentials(t *testing.T) {
	svc, ctx := newTestService(t)

	if err := svc.Register(ctx, "alice", "correct-password"); err != nil {
		t.Fatalf("register: %v", err)
	}

	_, err := svc.Login(ctx, "alice", "wrong-password")
	if err == nil {
		t.Fatal("expected error for wrong password, got nil")
	}
	if err.Error() != "invalid credentials" {
		t.Fatalf("want generic error message, got %q", err.Error())
	}

	_, err = svc.Login(ctx, "nobody", "anything")
	if err == nil {
		t.Fatal("expected error for unknown user, got nil")
	}
	if err.Error() != "invalid credentials" {
		t.Fatalf("want generic error for unknown user too, got %q", err.Error())
	}
}

func TestRefresh_Rotation(t *testing.T) {
	svc, ctx := newTestService(t)
	if err := svc.Register(ctx, "alice", "pw"); err != nil {
		t.Fatalf("register: %v", err)
	}

	first, err := svc.Login(ctx, "alice", "pw")
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	second, err := svc.Refresh(ctx, first.RefreshToken)
	if err != nil {
		t.Fatalf("first refresh: %v", err)
	}
	if second.RefreshToken == first.RefreshToken {
		t.Fatal("refresh token was not rotated — old and new are identical")
	}
	if second.AccessToken == "" {
		t.Fatal("refresh did not return a new access token")
	}
}

func TestRefresh_ReuseDetectionRevokesAll(t *testing.T) {
	svc, ctx := newTestService(t)
	if err := svc.Register(ctx, "alice", "pw"); err != nil {
		t.Fatalf("register: %v", err)
	}

	session1, err := svc.Login(ctx, "alice", "pw")
	if err != nil {
		t.Fatalf("login 1: %v", err)
	}
	session2, err := svc.Login(ctx, "alice", "pw")
	if err != nil {
		t.Fatalf("login 2: %v", err)
	}

	rotated, err := svc.Refresh(ctx, session1.RefreshToken)
	if err != nil {
		t.Fatalf("rotate session1: %v", err)
	}
	
	_, err = svc.Refresh(ctx, session1.RefreshToken)
	if err == nil {
		t.Fatal("expected reuse detection on replayed token, got nil")
	}
	if err.Error() != "refresh token reuse detected" {
		t.Fatalf("want reuse detection error, got %q", err.Error())
	}

	if _, err := svc.Refresh(ctx, session2.RefreshToken); err == nil {
		t.Fatal("session2 should have been revoked by reuse detection")
	}
	if _, err := svc.Refresh(ctx, rotated.RefreshToken); err == nil {
		t.Fatal("rotated session1 token should have been revoked too")
	}
}

func TestRefresh_ExpiredToken(t *testing.T) {
	pool := testutil.NewTestPool(t)

	cfg := testJWTConfig()
	cfg.RefreshTokenTTL = -1 * time.Second // already expired at insert time
	svc := auth.NewAuthService(auth.NewAuthRepo(pool), cfg)
	ctx := context.Background()

	if err := svc.Register(ctx, "alice", "pw"); err != nil {
		t.Fatalf("register: %v", err)
	}
	tokens, err := svc.Login(ctx, "alice", "pw")
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	if _, err := svc.Refresh(ctx, tokens.RefreshToken); err == nil {
		t.Fatal("expected error for expired refresh token, got nil")
	}
}

func TestRefresh_UnknownToken(t *testing.T) {
	svc, ctx := newTestService(t)

	if _, err := svc.Refresh(ctx, "not-a-real-token"); err == nil {
		t.Fatal("expected error for unknown token, got nil")
	}
}

func TestLogout_RevokesToken(t *testing.T) {
	svc, ctx := newTestService(t)
	if err := svc.Register(ctx, "alice", "pw"); err != nil {
		t.Fatalf("register: %v", err)
	}
	tokens, err := svc.Login(ctx, "alice", "pw")
	if err != nil {
		t.Fatalf("login: %v", err)
	}

	if err := svc.Logout(ctx, tokens.RefreshToken); err != nil {
		t.Fatalf("logout: %v", err)
	}

	if _, err := svc.Refresh(ctx, tokens.RefreshToken); err == nil {
		t.Fatal("expected refresh to fail after logout, got nil")
	}
}
