// Package database manages the SQLite connection and initialises the schema.
package database

import (
	"database/sql"
	"fmt"
	"log/slog"

	_ "modernc.org/sqlite" // register the sqlite driver

	"github.com/ganapathypt/finolio/db"
)

// Open opens (or creates) the SQLite database at the given file path, enables
// WAL mode and foreign-key enforcement, and applies the schema.
func Open(dbFile string) (*sql.DB, error) {
	sqlDB, err := sql.Open("sqlite", dbFile)
	if err != nil {
		return nil, fmt.Errorf("database: open %q: %w", dbFile, err)
	}

	// SQLite performs best with a single writer; keep the pool small.
	sqlDB.SetMaxOpenConns(1)

	if _, err = sqlDB.Exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;`); err != nil {
		sqlDB.Close()
		return nil, fmt.Errorf("database: pragmas: %w", err)
	}

	if _, err = sqlDB.Exec(db.Schema); err != nil {
		sqlDB.Close()
		return nil, fmt.Errorf("database: schema init: %w", err)
	}

	slog.Info("database ready", "file", dbFile)
	return sqlDB, nil
}
