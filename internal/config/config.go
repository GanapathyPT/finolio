// Package config holds application-wide configuration loaded exclusively from
// environment variables. No build-time injection (ldflags) is used; all
// runtime values, including version metadata, must be supplied via the
// environment.
package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config holds the runtime configuration for Finolio.
type Config struct {
	// -- App identity --------------------------------------------------------
	// AppEnv is the deployment environment ("development", "production", …).
	AppEnv string
	// AppVersion is the application version string (e.g. "1.2.3").
	AppVersion string
	// AppCommit is the VCS commit hash of the running build.
	AppCommit string
	// AppBuildTime is the RFC 3339 timestamp of when the binary was built.
	AppBuildTime string

	// -- Database ------------------------------------------------------------
	// DBFile is the path to the SQLite database file.
	DBFile string

	// -- Kite Connect --------------------------------------------------------
	// KiteAPIKey is the API key issued by Zerodha for Kite Connect.
	KiteAPIKey string
	// KiteAPISecret is the API secret used to generate the session checksum.
	KiteAPISecret string

	// -- HTTP server ---------------------------------------------------------
	// HTTPHost is the interface address the HTTP server binds to.
	HTTPHost string
	// HTTPPort is the TCP port the HTTP server listens on.
	HTTPPort int
	// HTTPReadTimeout is the maximum duration for reading the full request.
	HTTPReadTimeout time.Duration
	// HTTPWriteTimeout is the maximum duration for writing the full response.
	HTTPWriteTimeout time.Duration
	// HTTPIdleTimeout is how long idle keep-alive connections are kept open.
	HTTPIdleTimeout time.Duration

	// -- Logging -------------------------------------------------------------
	// LogLevel controls the verbosity of the structured logger
	// ("debug", "info", "warn", "error").
	LogLevel string
}

// Load reads every value from the environment. Missing optional variables fall
// back to sensible defaults; missing required variables return an error.
func Load() (*Config, error) {
	kiteAPIKey, err := envRequired("KITE_API_KEY")
	if err != nil {
		return nil, fmt.Errorf("config: %w", err)
	}

	kiteAPISecret, err := envRequired("KITE_API_SECRET")
	if err != nil {
		return nil, fmt.Errorf("config: %w", err)
	}

	httpPort, err := envInt("HTTP_PORT", 8080)
	if err != nil {
		return nil, fmt.Errorf("config: HTTP_PORT: %w", err)
	}

	return &Config{
		// App identity
		AppEnv:       envStr("APP_ENV", "development"),
		AppVersion:   envStr("APP_VERSION", "dev"),
		AppCommit:    envStr("APP_COMMIT", "unknown"),
		AppBuildTime: envStr("APP_BUILD_TIME", "unknown"),

		// Database
		DBFile: envStr("DB_FILE", "finolio.db"),

		// Kite Connect
		KiteAPIKey:    kiteAPIKey,
		KiteAPISecret: kiteAPISecret,

		// HTTP
		HTTPHost:         envStr("HTTP_HOST", "0.0.0.0"),
		HTTPPort:         httpPort,
		HTTPReadTimeout:  5 * time.Second,
		HTTPWriteTimeout: 10 * time.Second,
		HTTPIdleTimeout:  60 * time.Second,

		// Logging
		LogLevel: envStr("LOG_LEVEL", "info"),
	}, nil
}

// Addr returns the full "host:port" string for the HTTP server.
func (c *Config) Addr() string {
	return fmt.Sprintf("%s:%d", c.HTTPHost, c.HTTPPort)
}

// ── helpers ───────────────────────────────────────────────────────────────────

// envRequired returns the value of key or an error if the variable is unset or
// empty.
func envRequired(key string) (string, error) {
	v := os.Getenv(key)
	if v == "" {
		return "", fmt.Errorf("%s is required but not set", key)
	}
	return v, nil
}

func envStr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) (int, error) {
	v := os.Getenv(key)
	if v == "" {
		return fallback, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return 0, fmt.Errorf("expected integer, got %q", v)
	}
	return n, nil
}
