package auth

import (
	"errors"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v5"
)

func ParseAccessToken(tokenString, secret string) (string, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return "", errors.New("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", errors.New("invalid claims")
	}

	sub, _ := claims["sub"].(string)
	if sub == "" {
		return "", errors.New("missing sub claim")
	}

	return sub, nil
}

func JWTMiddleware(secret string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			tokenString := ""

			if cookie, err := c.Cookie("access_token"); err == nil && cookie.Value != "" {
				tokenString = cookie.Value
			} else if authHeader := c.Request().Header.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
				tokenString = strings.TrimPrefix(authHeader, "Bearer ")
			}

			if tokenString == "" {
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "missing authentication token"})
			}

			userID, err := ParseAccessToken(tokenString, secret)
			if err != nil {
				return c.JSON(http.StatusUnauthorized, map[string]string{"error": "invalid or expired token"})
			}

			c.Set("user_id", userID)
			return next(c)
		}
	}
}
