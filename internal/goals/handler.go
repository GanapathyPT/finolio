package goals

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/ganapathypt/finolio/internal/auth"
)

// Handler handles HTTP requests for financial goals endpoints.
type Handler struct {
	service *Service
}

// NewHandler constructs a goals Handler.
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// ListTree handles GET /api/goals - returns goals tree.
func (h *Handler) ListTree(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r)
	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	tree, err := h.service.GetGoalsTree(r.Context(), userID)
	if err != nil {
		slog.Error("failed to get goals tree", "user_id", userID, "error", err)
		writeJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"goals": tree})
}

// Create handles POST /api/goals - creates a goal or sub-goal.
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r)
	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req CreateGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	created, err := h.service.CreateGoal(r.Context(), userID, req)
	if err != nil {
		slog.Warn("failed to create goal", "user_id", userID, "error", err)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, created)
}

// GetByID handles GET /api/goals/{id}
func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r)
	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	goalID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid goal id")
		return
	}

	goal, err := h.service.GetGoalByID(r.Context(), userID, goalID)
	if err != nil {
		writeJSONError(w, http.StatusNotFound, "goal not found")
		return
	}

	writeJSON(w, http.StatusOK, goal)
}

// Update handles PUT /api/goals/{id}
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r)
	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	goalID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid goal id")
		return
	}

	var req UpdateGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	updated, err := h.service.UpdateGoal(r.Context(), userID, goalID, req)
	if err != nil {
		slog.Warn("failed to update goal", "user_id", userID, "goal_id", goalID, "error", err)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, updated)
}

// Delete handles DELETE /api/goals/{id}
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r)
	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	goalID, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid goal id")
		return
	}

	if err := h.service.DeleteGoal(r.Context(), userID, goalID); err != nil {
		slog.Error("failed to delete goal", "user_id", userID, "goal_id", goalID, "error", err)
		writeJSONError(w, http.StatusInternalServerError, "failed to delete goal")
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// Reorder handles PUT /api/goals/reorder - bulk updates goal display priorities.
func (h *Handler) Reorder(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r)
	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req ReorderGoalsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.service.ReorderGoals(r.Context(), userID, req); err != nil {
		slog.Warn("failed to reorder goals", "user_id", userID, "error", err)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// AssignAsset handles POST /api/goals/assign-asset to tag or untag an asset.
func (h *Handler) AssignAsset(w http.ResponseWriter, r *http.Request) {
	userID, err := auth.GetUserID(r)
	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req AssignAssetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.service.AssignAsset(r.Context(), userID, req); err != nil {
		slog.Warn("failed to assign asset to goal", "user_id", userID, "error", err)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeJSONError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
