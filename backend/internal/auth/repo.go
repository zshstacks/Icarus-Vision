package auth

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AuthRepo struct {
	pool *pgxpool.Pool
}

func NewAuthRepo(pool *pgxpool.Pool) *AuthRepo {
	return &AuthRepo{pool: pool}
}

func (r *AuthRepo) CreateUser(ctx context.Context, username, passwordHash string) (string, error) {
	var userID string
	err := r.pool.QueryRow(ctx,
		`INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id`,
		username, passwordHash,
	).Scan(&userID)
	return userID, err

}
func (r *AuthRepo) GetUserByUsername(ctx context.Context, username string) (string, string, error) {
	var userID, passwordHash string
	err := r.pool.QueryRow(ctx,
		`SELECT id, password_hash FROM users WHERE username = $1`,
		username,
	).Scan(&userID, &passwordHash)

	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", errors.New("user not found")
	}
	return userID, passwordHash, err
}

func (r *AuthRepo) StoreRefreshToken(ctx context.Context, userID, tokenHash string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, tokenHash, expiresAt,
	)
	return err
}

func (r *AuthRepo) GetRefreshToken(ctx context.Context, tokenHash string) (string, string, time.Time, bool, error) {
	var id, userID string
	var expiresAt time.Time
	var revoked bool

	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, expires_at, revoked FROM refresh_tokens WHERE token_hash = $1`,
		tokenHash,
	).Scan(&id, &userID, &expiresAt, &revoked)

	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", time.Time{}, false, errors.New("token not found")
	}
	return id, userID, expiresAt, revoked, err
}

func (r *AuthRepo) RevokeRefreshToken(ctx context.Context, tokenID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE refresh_tokens SET revoked = true WHERE id = $1`, tokenID)
	return err
}

func (r *AuthRepo) RevokeAllUserTokens(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx, `UPDATE refresh_tokens SET revoked = true WHERE user_id = $1`, userID)
	return err
}
