package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	ServerPort string

	// MySQL Connection Pool Config
	DBHost            string
	DBPort            string
	DBUser            string
	DBPassword        string
	DBName            string
	DBMaxOpenConns    int
	DBMaxIdleConns    int
	DBConnMaxLifetime time.Duration

	// Redis Config
	RedisAddr     string
	RedisPassword string
	RedisDB       int
	RedisPoolSize int

	// JWT Config
	JWTSecret string
	JWTExpire time.Duration
}

func LoadConfig() *Config {
	_ = godotenv.Load(".env")

	cfg := &Config{
		ServerPort:        getEnv("SERVER_PORT", ":8080"),
		DBHost:            getEnv("DB_HOST", "127.0.0.1"),
		DBPort:            getEnv("DB_PORT", "3306"),
		DBUser:            getEnv("DB_USER", "crm_user"),
		DBPassword:        getEnv("DB_PASSWORD", "crm_pass_2026"),
		DBName:            getEnv("DB_NAME", "acme_crm"),
		DBMaxOpenConns:    getEnvAsInt("DB_MAX_OPEN_CONNS", 30),
		DBMaxIdleConns:    getEnvAsInt("DB_MAX_IDLE_CONNS", 10),
		DBConnMaxLifetime: time.Hour,

		RedisAddr:     getEnv("REDIS_ADDR", "127.0.0.1:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       getEnvAsInt("REDIS_DB", 0),
		RedisPoolSize: getEnvAsInt("REDIS_POOL_SIZE", 20),

		JWTSecret: getEnv("JWT_SECRET", "acme_crm_secret_key_2026_super_secure"),
		JWTExpire: time.Duration(getEnvAsInt("JWT_EXPIRE_HOURS", 24)) * time.Hour,
	}

	return cfg
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvAsInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return defaultVal
}
