package adsb

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type TokenManager struct {
	clientID     string
	clientSecret string
	token        string
	expiresAt    time.Time
}

type ClientManager struct {
	tokenManager *TokenManager
}

const tokenURL = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token"
const statesURL = "https://opensky-network.org/api/states/all"

func NewTokenManager(clientID string, clientSecret string) *TokenManager {

	tokenManager := &TokenManager{
		clientID:     clientID,
		clientSecret: clientSecret,
	}

	return tokenManager

}

func NewClientManager(tokenManager *TokenManager) *ClientManager {
	clientManager := &ClientManager{
		tokenManager: tokenManager,
	}

	return clientManager
}

func (tm *TokenManager) GetToken(ctx context.Context) (string, error) {
	type tokenResponse struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}

	var tr tokenResponse

	if tm.token != "" && time.Now().Before(tm.expiresAt) {
		return tm.token, nil
	}

	v := url.Values{}
	v.Set("grant_type", "client_credentials")
	v.Set("client_id", tm.clientID)
	v.Set("client_secret", tm.clientSecret)

	req, err := http.NewRequestWithContext(ctx, "POST", tokenURL, strings.NewReader(v.Encode()))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("opensky token request failed: %s", resp.Status)
	}

	if err := json.NewDecoder(resp.Body).Decode(&tr); err != nil {
		return "", err
	}

	tm.token = tr.AccessToken
	tm.expiresAt = time.Now().Add(time.Duration(tr.ExpiresIn-30) * time.Second)

	return tm.token, nil

}

func (c *ClientManager) FetchStates(ctx context.Context) (*StatesResponse, error) {
	var statesResponse StatesResponse

	token, err := c.tokenManager.GetToken(ctx)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "GET", statesURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+token)
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("FetchStates: opensky token request failed: %s", resp.Status)
	}

	if err := json.NewDecoder(resp.Body).Decode(&statesResponse); err != nil {
		return nil, err
	}

	return &statesResponse, nil

}
