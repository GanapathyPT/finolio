package portfolio

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/ganapathypt/finolio/internal/auth"
)

// Handler handles HTTP requests for portfolio endpoints.
type Handler struct {
	service *Service
}

// NewHandler creates a new portfolio Handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Sync handles POST /api/portfolio/sync
func (h *Handler) Sync(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"}) //nolint:errcheck
		return
	}

	portfolio, err := h.service.Sync(r.Context(), userID)
	if err != nil {
		slog.Error("failed to sync portfolio", "user_id", userID, "error", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()}) //nolint:errcheck
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(portfolio) //nolint:errcheck
}

// GetPortfolio handles GET /api/portfolio
func (h *Handler) GetPortfolio(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"}) //nolint:errcheck
		return
	}

	portfolio, err := h.service.GetPortfolio(r.Context(), userID)
	if err != nil {
		slog.Error("failed to get portfolio", "user_id", userID, "error", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()}) //nolint:errcheck
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(portfolio) //nolint:errcheck
}

// GetHistory handles GET /api/portfolio/history
func (h *Handler) GetHistory(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"}) //nolint:errcheck
		return
	}

	limit := int64(90)
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsed, err := strconv.ParseInt(limitStr, 10, 64); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	history, err := h.service.GetHistory(r.Context(), userID, limit)
	if err != nil {
		slog.Error("failed to get portfolio history", "user_id", userID, "error", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()}) //nolint:errcheck
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]any{"history": history}) //nolint:errcheck
}
