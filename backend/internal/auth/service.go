package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"log"
	"time"

	"icarus-vision/internal/config"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	repo *AuthRepo
	cfg  config.JWTConfig
}

func NewAuthService(repo *AuthRepo, cfg config.JWTConfig) *AuthService {
	return &AuthService{repo: repo, cfg: cfg}
}

type TokenPair struct {
	AccessToken  string
	RefreshToken string
}

func (s *AuthService) Register(ctx context.Context, username, password string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = s.repo.CreateUser(ctx, username, string(hash))
	return err
}

func (s *AuthService) Login(ctx context.Context, username, password string) (*TokenPair, error) {
	userID, passwordHash, err := s.repo.GetUserByUsername(ctx, username)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	return s.generateTokens(ctx, userID)
}

// Refresh rotates the refresh token and issues new tokens
func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (*TokenPair, error) {
	tokenHash := hashToken(refreshToken)

	tokenID, userID, expiresAt, revoked, err := s.repo.GetRefreshToken(ctx, tokenHash)
	if err != nil {
		return nil, errors.New("invalid or expired refresh token")
	}

	if revoked {
		log.Printf("auth: refresh token reuse detected for user %s (token_id=%s) — revoking all sessions", userID, tokenID)
		if revokeErr := s.repo.RevokeAllUserTokens(ctx, userID); revokeErr != nil {
			log.Printf("auth: failed to revoke all tokens for user %s after reuse detection: %v", userID, revokeErr)
		}
		return nil, errors.New("refresh token reuse detected")
	}

	if time.Now().After(expiresAt) {
		return nil, errors.New("invalid or expired refresh token")
	}

	// revoke the old token before issuing a new one
	if err := s.repo.RevokeRefreshToken(ctx, tokenID); err != nil {
		log.Printf("auth: failed to revoke old refresh token %s for user %s: %v", tokenID, userID, err)
		return nil, errors.New("failed to rotate refresh token")
	}

	return s.generateTokens(ctx, userID)
}

func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	tokenHash := hashToken(refreshToken)

	tokenID, _, _, _, err := s.repo.GetRefreshToken(ctx, tokenHash)
	if err != nil {
		return nil
	}

	return s.repo.RevokeRefreshToken(ctx, tokenID)
}

func (s *AuthService) generateTokens(ctx context.Context, userID string) (*TokenPair, error) {
	// Jwt generate
	accessClaims := jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(s.cfg.AccessTokenTTL).Unix(),
		"iat": time.Now().Unix(),
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	signedAccess, err := accessToken.SignedString([]byte(s.cfg.Secret))
	if err != nil {
		return nil, err
	}

	// Refresh token generate
	refreshBytes := make([]byte, 32)
	if _, err := rand.Read(refreshBytes); err != nil {
		return nil, err
	}
	refreshToken := hex.EncodeToString(refreshBytes)

	// Store hashed refresh token in DB
	if err := s.repo.StoreRefreshToken(ctx, userID, hashToken(refreshToken), time.Now().Add(s.cfg.RefreshTokenTTL)); err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  signedAccess,
		RefreshToken: refreshToken,
	}, nil
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}
