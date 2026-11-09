package server

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/ganapathypt/finolio/internal/config"
)

func TestServerSPARoutes(t *testing.T) {
	// Create temporary directory for static files
	tempDir := t.TempDir()
	indexContent := "<html><body>Finolio Web App</body></html>"
	assetContent := "console.log('finolio');"

	if err := os.WriteFile(filepath.Join(tempDir, "index.html"), []byte(indexContent), 0644); err != nil {
		t.Fatalf("failed to create index.html: %v", err)
	}

	assetsDir := filepath.Join(tempDir, "assets")
	if err := os.Mkdir(assetsDir, 0755); err != nil {
		t.Fatalf("failed to create assets dir: %v", err)
	}

	if err := os.WriteFile(filepath.Join(assetsDir, "app.js"), []byte(assetContent), 0644); err != nil {
		t.Fatalf("failed to create app.js: %v", err)
	}

	cfg := &config.Config{
		HTTPHost:         "127.0.0.1",
		HTTPPort:         8080,
		HTTPReadTimeout:  5 * time.Second,
		HTTPWriteTimeout: 10 * time.Second,
		HTTPIdleTimeout:  60 * time.Second,
		AppVersion:       "test",
		StaticDir:        tempDir,
		KiteAPIKey:       "key",
		KiteAPISecret:    "secret",
	}

	s := New(cfg, nil)

	// Test 1: Root "/" serves index.html
	reqRoot := httptest.NewRequest(http.MethodGet, "/", nil)
	recRoot := httptest.NewRecorder()
	s.http.Handler.ServeHTTP(recRoot, reqRoot)

	if recRoot.Code != http.StatusOK {
		t.Errorf("expected status 200 for root, got %d", recRoot.Code)
	}
	if !strings.Contains(recRoot.Body.String(), "Finolio Web App") {
		t.Errorf("expected root to serve index.html, got %q", recRoot.Body.String())
	}

	// Test 2: Asset "/assets/app.js" serves physical file
	reqAsset := httptest.NewRequest(http.MethodGet, "/assets/app.js", nil)
	recAsset := httptest.NewRecorder()
	s.http.Handler.ServeHTTP(recAsset, reqAsset)

	if recAsset.Code != http.StatusOK {
		t.Errorf("expected status 200 for asset, got %d", recAsset.Code)
	}
	if !strings.Contains(recAsset.Body.String(), "console.log('finolio');") {
		t.Errorf("expected asset content, got %q", recAsset.Body.String())
	}

	// Test 3: SPA route "/dashboard" falls back to index.html
	reqSPA := httptest.NewRequest(http.MethodGet, "/dashboard", nil)
	recSPA := httptest.NewRecorder()
	s.http.Handler.ServeHTTP(recSPA, reqSPA)

	if recSPA.Code != http.StatusOK {
		t.Errorf("expected status 200 for SPA route, got %d", recSPA.Code)
	}
	if !strings.Contains(recSPA.Body.String(), "Finolio Web App") {
		t.Errorf("expected SPA route to serve index.html, got %q", recSPA.Body.String())
	}

	// Test 4: Missing asset returns 404
	reqMissingAsset := httptest.NewRequest(http.MethodGet, "/assets/missing.js", nil)
	recMissingAsset := httptest.NewRecorder()
	s.http.Handler.ServeHTTP(recMissingAsset, reqMissingAsset)

	if recMissingAsset.Code != http.StatusNotFound {
		t.Errorf("expected status 404 for missing asset, got %d", recMissingAsset.Code)
	}

	// Test 5: API route "/api/healthz" returns JSON
	reqAPI := httptest.NewRequest(http.MethodGet, "/api/healthz", nil)
	recAPI := httptest.NewRecorder()
	s.http.Handler.ServeHTTP(recAPI, reqAPI)

	if recAPI.Code != http.StatusOK {
		t.Errorf("expected status 200 for /api/healthz, got %d", recAPI.Code)
	}
	if !strings.Contains(recAPI.Body.String(), `"status":"ok"`) {
		t.Errorf("expected json health response, got %q", recAPI.Body.String())
	}

	// Test 6: PWA manifest "/manifest.webmanifest" serves application/manifest+json
	manifestContent := `{"name":"Finolio"}`
	if err := os.WriteFile(filepath.Join(tempDir, "manifest.webmanifest"), []byte(manifestContent), 0644); err != nil {
		t.Fatalf("failed to create manifest: %v", err)
	}
	reqManifest := httptest.NewRequest(http.MethodGet, "/manifest.webmanifest", nil)
	recManifest := httptest.NewRecorder()
	s.http.Handler.ServeHTTP(recManifest, reqManifest)

	if recManifest.Code != http.StatusOK {
		t.Errorf("expected status 200 for manifest, got %d", recManifest.Code)
	}
	if !strings.Contains(recManifest.Header().Get("Content-Type"), "application/manifest+json") {
		t.Errorf("expected application/manifest+json, got %q", recManifest.Header().Get("Content-Type"))
	}
}

