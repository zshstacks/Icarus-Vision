package auth

import (
	"icarus-vision/internal/config"
	"net/http"

	"github.com/labstack/echo/v5"
)

type AuthHandler struct {
	service *AuthService
	cfg     config.JWTConfig
}

func NewAuthHandler(service *AuthService, cfg config.JWTConfig) *AuthHandler {
	return &AuthHandler{service: service, cfg: cfg}
}

type AuthRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// return the auth users ID, reached only through middleware
func (h *AuthHandler) Me(c *echo.Context) error {
	userID, _ := c.Get("user_id").(string)
	return c.JSON(http.StatusOK, map[string]string{"user_id": userID})
}

func (h *AuthHandler) Register(c *echo.Context) error {
	var req AuthRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	if err := h.service.Register(c.Request().Context(), req.Username, req.Password); err != nil {
		return c.JSON(http.StatusConflict, map[string]string{"error": "username already taken or invalid"})
	}

	return c.JSON(http.StatusCreated, map[string]string{"message": "user registered successfully"})
}

func (h *AuthHandler) Login(c *echo.Context) error {
	var req AuthRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	tokens, err := h.service.Login(c.Request().Context(), req.Username, req.Password)
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": err.Error()})
	}

	h.setAuthCookies(c, tokens)
	return c.JSON(http.StatusOK, map[string]string{"message": "logged in successfully"})
}

func (h *AuthHandler) Refresh(c *echo.Context) error {
	cookie, err := c.Cookie("refresh_token")
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "no refresh token provided"})
	}

	tokens, err := h.service.Refresh(c.Request().Context(), cookie.Value)
	if err != nil {
		h.clearAuthCookies(c)
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": err.Error()})
	}

	h.setAuthCookies(c, tokens)
	return c.JSON(http.StatusOK, map[string]string{"message": "token refreshed"})
}

func (h *AuthHandler) Logout(c *echo.Context) error {
	cookie, err := c.Cookie("refresh_token")
	if err == nil {
		_ = h.service.Logout(c.Request().Context(), cookie.Value)
	}

	h.clearAuthCookies(c)
	return c.JSON(http.StatusOK, map[string]string{"message": "logged out"})
}

// Helpers for cookies
func (h *AuthHandler) setAuthCookies(c *echo.Context, tokens *TokenPair) {
	// Access Token Cookie
	c.SetCookie(&http.Cookie{
		Name:     "access_token",
		Value:    tokens.AccessToken,
		Path:     "/",
		MaxAge:   int(h.cfg.AccessTokenTTL.Seconds()),
		HttpOnly: true,
		Secure:   h.cfg.SecureCookie,
		SameSite: http.SameSiteLaxMode,
	})

	// Refresh Token Cookie
	c.SetCookie(&http.Cookie{
		Name:     "refresh_token",
		Value:    tokens.RefreshToken,
		Path:     "/auth/refresh", // Only sent to refresh endpoint
		MaxAge:   int(h.cfg.RefreshTokenTTL.Seconds()),
		HttpOnly: true,
		Secure:   h.cfg.SecureCookie,
		SameSite: http.SameSiteStrictMode,
	})
}

func (h *AuthHandler) clearAuthCookies(c *echo.Context) {
	c.SetCookie(&http.Cookie{Name: "access_token", Value: "", MaxAge: -1, Path: "/"})
	c.SetCookie(&http.Cookie{Name: "refresh_token", Value: "", MaxAge: -1, Path: "/auth/refresh"})
}
