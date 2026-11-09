// Package server builds and runs the chi HTTP server.
package server

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/ganapathypt/finolio/internal/auth"
	"github.com/ganapathypt/finolio/internal/config"
	"github.com/ganapathypt/finolio/internal/store"
)

// Server wraps an *http.Server and exposes Start / Shutdown lifecycle methods.
type Server struct {
	http *http.Server
	cfg  *config.Config
}

// New constructs a Server with all routes registered.
func New(cfg *config.Config, queries *store.Queries) *Server {
	r := chi.NewRouter()

	// -- Global middleware ---------------------------------------------------
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(cfg.HTTPWriteTimeout - 1*time.Second))

	s := &Server{cfg: cfg}

	// -- Routes --------------------------------------------------------------
	// All application routes live under /api.
	authHandler := auth.NewHandler(cfg, queries)
	r.Route("/api", func(r chi.Router) {
		r.Get("/healthz", s.handleHealth)

		// Auth (Kite Connect OAuth)
		r.Route("/auth", func(r chi.Router) {
			r.Get("/login", authHandler.Login)
			r.Get("/callback", authHandler.Callback)
			r.Get("/me", authHandler.Me)
			r.Post("/logout", authHandler.Logout)
		})
	})

	s.http = &http.Server{
		Addr:         cfg.Addr(),
		Handler:      r,
		ReadTimeout:  cfg.HTTPReadTimeout,
		WriteTimeout: cfg.HTTPWriteTimeout,
		IdleTimeout:  cfg.HTTPIdleTimeout,
	}

	return s
}

// Start begins listening and blocks until the server stops.
// A non-ErrServerClosed error is returned on unexpected failure.
func (s *Server) Start() error {
	slog.Info("http server listening", "addr", s.cfg.Addr())
	if err := s.http.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("http server: %w", err)
	}
	return nil
}

// Shutdown gracefully drains in-flight requests.
func (s *Server) Shutdown(ctx context.Context) error {
	slog.Info("http server shutting down")
	return s.http.Shutdown(ctx)
}

// ── handlers ─────────────────────────────────────────────────────────────────

// handleHealth returns a minimal health-check payload.
//
//	GET /api/healthz → 200 OK
//	{"status":"ok","version":"…","commit":"…","build_time":"…"}
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w,
		`{"status":"ok","version":%q,"commit":%q,"build_time":%q}`+"\n",
		s.cfg.AppVersion,
		s.cfg.AppCommit,
		s.cfg.AppBuildTime,
	)
}
