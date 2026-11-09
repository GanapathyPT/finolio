package auth

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/ganapathypt/finolio/internal/config"
)

func TestIsValidRedirectURL(t *testing.T) {
	tests := []struct {
		url   string
		valid bool
	}{
		{"http://localhost:5173", true},
		{"http://localhost:8080", true},
		{"https://app.finolio.com", true},
		{"http://127.0.0.1:5173/dashboard", true},
		{"/dashboard", true},
		{"/", true},
		{"//evil.com", false},
		{"javascript:alert(1)", false},
		{"", false},
	}

	for _, tt := range tests {
		t.Run(tt.url, func(t *testing.T) {
			if got := isValidRedirectURL(tt.url); got != tt.valid {
				t.Errorf("isValidRedirectURL(%q) = %v, want %v", tt.url, got, tt.valid)
			}
		})
	}
}

func TestLoginRedirectCookie(t *testing.T) {
	cfg := &config.Config{
		KiteAPIKey:    "test_key",
		KiteAPISecret: "test_secret",
		AppEnv:        "development",
	}

	h := NewHandler(cfg, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/auth/login?redirect_to=http://localhost:5173", nil)
	rec := httptest.NewRecorder()

	h.Login(rec, req)

	res := rec.Result()
	defer res.Body.Close()

	if res.StatusCode != http.StatusFound {
		t.Fatalf("expected status 302 Found, got %d", res.StatusCode)
	}

	// Verify redirect cookie was set
	cookies := res.Cookies()
	var redirectCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == RedirectCookieName {
			redirectCookie = c
			break
		}
	}

	if redirectCookie == nil {
		t.Fatal("expected finolio_auth_redirect cookie to be set")
	}

	if redirectCookie.Value != "http://localhost:5173" {
		t.Errorf("expected cookie value http://localhost:5173, got %q", redirectCookie.Value)
	}

	// Verify location header redirects to kite with redirect_params
	location := res.Header.Get("Location")
	if !strings.Contains(location, "api_key=test_key") {
		t.Errorf("expected Location to contain api_key=test_key, got %q", location)
	}
	if !strings.Contains(location, "redirect_params=") {
		t.Errorf("expected Location to contain redirect_params, got %q", location)
	}
}

func TestLogoutClearsCookie(t *testing.T) {
	cfg := &config.Config{
		KiteAPIKey:    "test_key",
		KiteAPISecret: "test_secret",
		AppEnv:        "development",
	}

	h := NewHandler(cfg, nil)

	req := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
	req.AddCookie(&http.Cookie{
		Name:  SessionCookieName,
		Value: "1",
	})
	rec := httptest.NewRecorder()

	h.Logout(rec, req)

	res := rec.Result()
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200 OK, got %d", res.StatusCode)
	}

	// Verify session cookie was cleared (MaxAge < 0 or empty)
	cookies := res.Cookies()
	var sessionCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == SessionCookieName {
			sessionCookie = c
			break
		}
	}

	if sessionCookie == nil {
		t.Fatal("expected session cookie to be present in response")
	}

	if sessionCookie.MaxAge >= 0 {
		t.Errorf("expected session cookie MaxAge < 0, got %d", sessionCookie.MaxAge)
	}
}
