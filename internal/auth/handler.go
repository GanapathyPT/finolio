// Package auth implements Zerodha Kite Connect OAuth authentication.
//
// Flow:
//
//  1. Client calls GET /api/auth/login  → server redirects to Kite login page.
//  2. User completes 2FA on Kite; Kite redirects to the URL registered in the
//     Kite Developer Console with ?request_token=…&status=success (or
//     status=error) appended.
//  3. Client calls GET /api/auth/callback?request_token=…  → server exchanges
//     the one-time request_token for a session access_token, upserts the user
//     and session in the database, sets an HTTP-only session cookie, and
//     redirects to the frontend application (or returns JSON).
//  4. Frontend checks GET /api/auth/me to fetch current session user info.
//  5. Frontend can call POST /api/auth/logout to clear the session.
package auth

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	kiteconnect "github.com/zerodha/gokiteconnect/v4"

	"github.com/ganapathypt/finolio/internal/config"
	"github.com/ganapathypt/finolio/internal/store"
)

const (
	SessionCookieName  = "finolio_session"
	RedirectCookieName = "finolio_auth_redirect"
)

// GetUserID extracts and parses the authenticated user ID from the session cookie.
func GetUserID(r *http.Request) (int64, error) {
	cookie, err := r.Cookie(SessionCookieName)
	if err != nil || cookie.Value == "" {
		return 0, errors.New("unauthorized: missing session")
	}
	userID, err := strconv.ParseInt(cookie.Value, 10, 64)
	if err != nil {
		return 0, errors.New("unauthorized: invalid session")
	}
	return userID, nil
}

// Handler holds the Kite client and handles all auth HTTP routes.
type Handler struct {
	kite      *kiteconnect.Client
	apiKey    string
	apiSecret string
	queries   *store.Queries
	appEnv    string
}

// NewHandler creates a Handler wired to the Kite Connect API and the database.
func NewHandler(cfg *config.Config, queries *store.Queries) *Handler {
	return &Handler{
		kite:      kiteconnect.New(cfg.KiteAPIKey),
		apiKey:    cfg.KiteAPIKey,
		apiSecret: cfg.KiteAPISecret,
		queries:   queries,
		appEnv:    cfg.AppEnv,
	}
}

// Login redirects the browser to the Kite Connect login page.
// The frontend can pass ?redirect_to=... with its current origin/URL so the user
// is returned there upon successful OAuth completion.
//
//	GET /api/auth/login?redirect_to=http://localhost:5173
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	redirectTo := r.URL.Query().Get("redirect_to")
	if redirectTo == "" {
		redirectTo = r.URL.Query().Get("return_to")
	}
	if redirectTo == "" {
		redirectTo = r.URL.Query().Get("redirect_url")
	}

	if redirectTo != "" && isValidRedirectURL(redirectTo) {
		http.SetCookie(w, &http.Cookie{
			Name:     RedirectCookieName,
			Value:    redirectTo,
			Path:     "/",
			HttpOnly: true,
			Secure:   h.appEnv == "production",
			SameSite: http.SameSiteLaxMode,
			MaxAge:   int(10 * time.Minute.Seconds()),
		})
	}

	loginURL := h.kite.GetLoginURL()
	if redirectTo != "" && isValidRedirectURL(redirectTo) {
		params := url.Values{}
		params.Set("redirect_to", redirectTo)
		loginURL = h.kite.GetLoginURLWithparams(params)
	}

	http.Redirect(w, r, loginURL, http.StatusFound)
}

// Callback handles the redirect from Kite after a successful login.
// It exchanges the one-time request_token for a persistent access_token,
// upserts the user and Kite session in the database, sets an HTTP-only
// session cookie, and redirects to "/" (or returns JSON if requested).
//
//	GET /api/auth/callback?request_token=<token>&status=success
func (h *Handler) Callback(w http.ResponseWriter, r *http.Request) {
	if status := r.URL.Query().Get("status"); status != "success" {
		slog.Warn("kite auth failed or was cancelled", "status", status)
		http.Error(w, "authentication failed or was cancelled", http.StatusBadRequest)
		return
	}

	requestToken := r.URL.Query().Get("request_token")
	if requestToken == "" {
		http.Error(w, "missing request_token", http.StatusBadRequest)
		return
	}

	session, err := h.kite.GenerateSession(requestToken, h.apiSecret)
	if err != nil {
		slog.Error("kite session generation failed", "error", err)
		http.Error(w, "failed to exchange token", http.StatusInternalServerError)
		return
	}

	// Persist user identity.
	user, err := h.queries.UpsertUser(r.Context(), store.UpsertUserParams{
		KiteID:   session.UserID,
		UserName: session.UserName,
		Email:    session.Email,
	})
	if err != nil {
		slog.Error("failed to upsert user", "kite_id", session.UserID, "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	// Persist (or refresh) the daily Kite session token.
	kiteSession, err := h.queries.UpsertKiteSession(r.Context(), store.UpsertKiteSessionParams{
		UserID:      user.ID,
		AccessToken: session.AccessToken,
		PublicToken: session.PublicToken,
		LoginTime:   session.LoginTime.Time,
	})
	if err != nil {
		slog.Error("failed to upsert kite session", "user_id", user.ID, "error", err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	slog.Info("kite session established",
		"user_id", session.UserID,
		"user_name", session.UserName,
	)

	// Set HTTP-only session cookie with the user ID.
	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookieName,
		Value:    strconv.FormatInt(user.ID, 10),
		Path:     "/",
		HttpOnly: true,
		Secure:   h.appEnv == "production",
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int(24 * time.Hour.Seconds()),
	})

	// Retrieve the redirect destination provided by the frontend:
	// 1. From Kite query parameter (redirect_params)
	// 2. From the short-lived redirect cookie set in Login
	// 3. Fallback to "/"
	redirectTo := r.URL.Query().Get("redirect_to")
	if redirectTo == "" || !isValidRedirectURL(redirectTo) {
		if cookie, err := r.Cookie(RedirectCookieName); err == nil && cookie.Value != "" && isValidRedirectURL(cookie.Value) {
			redirectTo = cookie.Value
		}
	}

	// Always clear the temporary redirect cookie.
	http.SetCookie(w, &http.Cookie{
		Name:     RedirectCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   h.appEnv == "production",
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})

	if redirectTo == "" {
		redirectTo = "/"
	}

	// If browser redirect (or not JSON accept), redirect to destination.
	accept := r.Header.Get("Accept")
	if !strings.Contains(accept, "application/json") {
		http.Redirect(w, r, redirectTo, http.StatusFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(sessionResponse{ //nolint:errcheck
		AccessToken: kiteSession.AccessToken,
		PublicToken: kiteSession.PublicToken,
		UserID:      user.KiteID,
		UserName:    user.UserName,
		Email:       user.Email,
		LoginTime:   kiteSession.LoginTime.Format(time.RFC3339),
	})
}

// Me returns the current authenticated user's profile and active Kite session.
//
//	GET /api/auth/me
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	userID, err := GetUserID(r)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		fmt.Fprintln(w, `{"authenticated":false}`)
		return
	}

	user, err := h.queries.GetUserByID(r.Context(), userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			h.clearCookie(w)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		fmt.Fprintln(w, `{"authenticated":false}`)
		return
	}

	kiteSession, err := h.queries.GetKiteSessionByUserID(r.Context(), user.ID)
	hasActiveKiteSession := err == nil && kiteSession.AccessToken != ""

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(meResponse{
		Authenticated: true,
		User: userDTO{
			ID:       user.ID,
			KiteID:   user.KiteID,
			UserName: user.UserName,
			Email:    user.Email,
		},
		HasKiteSession: hasActiveKiteSession,
	})
}

// Logout invalidates the active Kite Connect session on Zerodha's servers,
// deletes the session from the local database, and clears the session cookie.
//
//	POST /api/auth/logout
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	if userID, err := GetUserID(r); err == nil && h.queries != nil {
		// Fetch the user's active Kite session to invalidate the token on Kite's server
		kiteSession, err := h.queries.GetKiteSessionByUserID(r.Context(), userID)
		if err == nil && kiteSession.AccessToken != "" {
			kc := kiteconnect.New(h.apiKey)
			kc.SetAccessToken(kiteSession.AccessToken)
			if _, err := kc.InvalidateAccessToken(); err != nil {
				slog.Warn("failed to invalidate access token on kite servers",
					"user_id", userID,
					"error", err,
				)
			} else {
				slog.Info("successfully invalidated access token on kite servers",
					"user_id", userID,
				)
			}
		}

		// Delete local database session
		if err := h.queries.DeleteKiteSession(r.Context(), userID); err != nil {
			slog.Error("failed to delete kite session from database",
				"user_id", userID,
				"error", err,
			)
		}
	}

	h.clearCookie(w)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, `{"success":true}`)
}

func (h *Handler) clearCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})
}

// sessionResponse is the JSON payload returned on successful authentication.
type sessionResponse struct {
	AccessToken string `json:"access_token"`
	PublicToken string `json:"public_token"`
	UserID      string `json:"user_id"`
	UserName    string `json:"user_name"`
	Email       string `json:"email"`
	LoginTime   string `json:"login_time"`
}

type userDTO struct {
	ID       int64  `json:"id"`
	KiteID   string `json:"kite_id"`
	UserName string `json:"user_name"`
	Email    string `json:"email"`
}

type meResponse struct {
	Authenticated  bool    `json:"authenticated"`
	User           userDTO `json:"user"`
	HasKiteSession bool    `json:"has_kite_session"`
}

// isValidRedirectURL verifies that the target URL is a safe relative path or HTTP/HTTPS URL.
func isValidRedirectURL(rawURL string) bool {
	if rawURL == "" {
		return false
	}
	if strings.HasPrefix(rawURL, "/") && !strings.HasPrefix(rawURL, "//") {
		return true
	}
	u, err := url.Parse(rawURL)
	if err != nil {
		return false
	}
	return u.Scheme == "http" || u.Scheme == "https"
}
