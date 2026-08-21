package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type AppConfig struct {
	Environment string
	Server      ServerConfig
	CORS        CorsConfig
	OpenSky     OpenSkyConfig
}

type ServerConfig struct {
	Port string
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
		log.Fatal("Missing OpenSky	 client ID or client secret")
	}

	return AppConfig{
		Environment: env,
		Server: ServerConfig{
			Port: getEnv("PORT", "8080"),
		},
		CORS: CorsConfig{
			AllowedOrigins: getCORSOrigins(isProd),
			AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
			AllowedHeaders: []string{"Origin", "Content-Type", "Authorization"},
		},
		OpenSky: OpenSkyConfig{
			ClientID:     getEnv("OPEN_SKY_CLIENT_ID", ""),
			ClientSecret: getEnv("OPEN_SKY_CLIENT_SECRET", ""),
		},
	}
}

// Helpers
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
