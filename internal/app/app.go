// Package app wires together all subsystems and runs the application until the
// context is cancelled.
package app

import (
	"context"
	"log/slog"
	"time"

	"github.com/ganapathypt/finolio/internal/config"
	"github.com/ganapathypt/finolio/internal/database"
	"github.com/ganapathypt/finolio/internal/server"
	"github.com/ganapathypt/finolio/internal/store"
)

// Run starts all subsystems and blocks until ctx is cancelled or a fatal error
// occurs. On shutdown it gives subsystems up to 15 s to drain gracefully.
func Run(ctx context.Context, cfg *config.Config) error {
	slog.Info("starting finolio",
		"env", cfg.AppEnv,
		"version", cfg.AppVersion,
		"commit", cfg.AppCommit,
	)

	// -- Database ------------------------------------------------------------
	db, err := database.Open(cfg.DBFile)
	if err != nil {
		return err
	}
	defer db.Close()

	queries := store.New(db)

	// -- HTTP server ---------------------------------------------------------
	srv := server.New(cfg, queries)

	errCh := make(chan error, 1)
	go func() {
		errCh <- srv.Start()
	}()

	select {
	case <-ctx.Done():
		slog.Info("shutdown signal received")
	case err := <-errCh:
		return err
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return err
	}

	slog.Info("shutdown complete")
	return nil
}
