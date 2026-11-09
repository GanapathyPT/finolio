package server

import (
	"mime"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
)

func init() {
	_ = mime.AddExtensionType(".webmanifest", "application/manifest+json")
}

// spaHandler serves static files from staticDir and falls back to index.html for SPA routes.
func spaHandler(staticDir string) http.HandlerFunc {
	fs := http.Dir(staticDir)
	fileServer := http.FileServer(fs)

	return func(w http.ResponseWriter, r *http.Request) {
		cleanPath := path.Clean(r.URL.Path)

		// Serve physical file if it exists and is not a directory
		f, err := fs.Open(cleanPath)
		if err == nil {
			stat, err := f.Stat()
			_ = f.Close()
			if err == nil && !stat.IsDir() {
				fileServer.ServeHTTP(w, r)
				return
			}
		}

		// Don't serve index.html for missing static assets (e.g. broken script or image paths)
		if strings.HasPrefix(cleanPath, "/assets/") || (filepath.Ext(cleanPath) != "" && cleanPath != "/") {
			http.NotFound(w, r)
			return
		}

		// Fall back to index.html for client-side routing
		indexPath := filepath.Join(staticDir, "index.html")
		if _, err := os.Stat(indexPath); err == nil {
			http.ServeFile(w, r, indexPath)
			return
		}

		http.NotFound(w, r)
	}
}

