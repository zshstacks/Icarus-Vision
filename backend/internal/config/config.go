package config

import (
	"log"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type AppConfig struct {
	Environment string
	Server      ServerConfig
	CORS        CorsConfig
	OpenSky     OpenSkyConfig
	Database    DatabaseConfig
	JWT         JWTConfig
}

type ServerConfig struct {
	Port string

	TrustedProxies []string
}

type DatabaseConfig struct {
	URL string
}

type CorsConfig struct {
	AllowedOrigins []string
	AllowedMethods []string
	AllowedHeaders []string
}

type OpenSkyConfig struct {
	ClientID     string
	ClientSecret string
}

type JWTConfig struct {
	Secret          string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
	SecureCookie    bool
}

func LoadConfig() AppConfig {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	env := getEnv("APP_ENV", "development")
	isProd := strings.ToLower(env) == "production"

	clientID := getEnv("OPEN_SKY_CLIENT_ID", "")
	clientSecret := getEnv("OPEN_SKY_CLIENT_SECRET", "")
	if clientID == "" || clientSecret == "" {
		log.Fatal("Missing OpenSky client ID or client secret")
	}

	dbURL := getEnv("DATABASE_URL", "")
	if dbURL == "" {
		log.Fatal("Missing DATABASE_URL")
	}

	jwtSecret := getEnv("JWT_SECRET", "")
	if jwtSecret == "" {
		log.Fatal("Missing JWT_SECRET")
	}

	trustedProxies := loadTrustedProxies()

	return AppConfig{
		Environment: env,
		Server: ServerConfig{
			Port:           getEnv("PORT", "8080"),
			TrustedProxies: trustedProxies,
		},
		CORS: CorsConfig{
			AllowedOrigins: getCORSOrigins(isProd),
			AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
			AllowedHeaders: []string{"Origin", "Content-Type", "Authorization"},
		},
		OpenSky: OpenSkyConfig{
			ClientID:     clientID,
			ClientSecret: clientSecret,
		},
		Database: DatabaseConfig{
			URL: dbURL,
		},
		JWT: JWTConfig{
			Secret:          jwtSecret,
			AccessTokenTTL:  15 * time.Minute,
			RefreshTokenTTL: 7 * 24 * time.Hour,
			SecureCookie:    isProd,
		},
	}
}

func loadTrustedProxies() []string {
	raw := os.Getenv("TRUSTED_PROXIES")
	if raw == "" {
		log.Println("TRUSTED_PROXIES not set — X-Forwarded-For will be ignored (RemoteAddr only)")
		return nil
	}

	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		out = append(out, p)
	}

	log.Printf("TRUSTED_PROXIES: %v — X-Forwarded-For accepted only from these CIDRs", out)
	return out
}

func getEnv(key, defaultVal string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultVal
}

func getCORSOrigins(isProd bool) []string {
	if isProd {
		origins := os.Getenv("CORS_ORIGINS")
		if origins != "" {
			return strings.Split(origins, ",")
		}
		return []string{"https://yourdomain.com"}
	}
	return []string{"http://localhost:5173", "http://localhost:8080", "http://localhost:3000"}
}
