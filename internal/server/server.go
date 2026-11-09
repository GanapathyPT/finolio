// Package server builds and runs the chi HTTP server.
package server

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/ganapathypt/finolio/internal/auth"
	"github.com/ganapathypt/finolio/internal/config"
	"github.com/ganapathypt/finolio/internal/goals"
	"github.com/ganapathypt/finolio/internal/portfolio"
	"github.com/ganapathypt/finolio/internal/store"
)

// Server wraps an *http.Server and exposes Start / Shutdown lifecycle methods.
type Server struct {
	http *http.Server
	cfg  *config.Config
}

// New constructs a Server with all routes registered.
func New(cfg *config.Config, db *sql.DB, queries *store.Queries) *Server {
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
	var portfolioHandler *portfolio.Handler
	var goalsHandler *goals.Handler
	if db != nil && queries != nil {
		portfolioService := portfolio.NewService(db, queries, cfg.KiteAPIKey, nil)
		portfolioHandler = portfolio.NewHandler(portfolioService)

		goalsService := goals.NewService(db, queries)
		goalsHandler = goals.NewHandler(goalsService)
	}

	r.Route("/api", func(r chi.Router) {
		r.Get("/healthz", s.handleHealth)

		// Auth (Kite Connect OAuth)
		r.Route("/auth", func(r chi.Router) {
			r.Get("/login", authHandler.Login)
			r.Get("/callback", authHandler.Callback)
			r.Get("/me", authHandler.Me)
			r.Post("/logout", authHandler.Logout)
		})

		// Portfolio
		if portfolioHandler != nil {
			r.Route("/portfolio", func(r chi.Router) {
				r.Post("/sync", portfolioHandler.Sync)
				r.Get("/", portfolioHandler.GetPortfolio)
				r.Get("/history", portfolioHandler.GetHistory)
			})
		}

		// Financial Goals
		if goalsHandler != nil {
			r.Route("/goals", func(r chi.Router) {
				r.Get("/", goalsHandler.ListTree)
				r.Post("/", goalsHandler.Create)
				r.Post("/assign-asset", goalsHandler.AssignAsset)
				r.Get("/{id}", goalsHandler.GetByID)
				r.Put("/{id}", goalsHandler.Update)
				r.Delete("/{id}", goalsHandler.Delete)
			})
		}
	})

	// -- Static files / SPA --------------------------------------------------
	// Serve compiled web assets if StaticDir exists on disk.
	if cfg.StaticDir != "" {
		if info, err := os.Stat(cfg.StaticDir); err == nil && info.IsDir() {
			slog.Info("serving static files", "dir", cfg.StaticDir)
			r.Get("/*", spaHandler(cfg.StaticDir))
		} else {
			slog.Info("static directory not found, static file server disabled", "dir", cfg.StaticDir)
		}
	}

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
