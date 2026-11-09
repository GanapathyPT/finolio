package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/ganapathypt/finolio/internal/app"
	"github.com/ganapathypt/finolio/internal/config"
)

func main() {
	// Structured logger – level adjusted later once config is loaded.
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	// Load configuration from environment variables.
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	// Context that cancels on SIGINT / SIGTERM.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Run the application.
	if err := app.Run(ctx, cfg); err != nil {
		slog.Error("application error", "error", err)
		os.Exit(1)
	}
}
