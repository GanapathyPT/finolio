// Package database manages the SQLite connection and initialises the schema.
package database

import (
	"database/sql"
	"fmt"
	"log/slog"

	_ "modernc.org/sqlite" // register the sqlite driver
)

// schema holds all CREATE TABLE statements. Using IF NOT EXISTS makes this safe
// to run on every startup without a separate migration tool.
const schema = `
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER  PRIMARY KEY AUTOINCREMENT,
    kite_id     TEXT     NOT NULL UNIQUE,
    user_name   TEXT     NOT NULL,
    email       TEXT     NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at  DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS kite_sessions (
    id            INTEGER  PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER  NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    access_token  TEXT     NOT NULL,
    public_token  TEXT     NOT NULL,
    login_time    DATETIME NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
`

// Open opens (or creates) the SQLite database at the given file path, enables
// WAL mode and foreign-key enforcement, and applies the schema.
func Open(dbFile string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", dbFile)
	if err != nil {
		return nil, fmt.Errorf("database: open %q: %w", dbFile, err)
	}

	// SQLite performs best with a single writer; keep the pool small.
	db.SetMaxOpenConns(1)

	if _, err = db.Exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;`); err != nil {
		db.Close()
		return nil, fmt.Errorf("database: pragmas: %w", err)
	}

	if _, err = db.Exec(schema); err != nil {
		db.Close()
		return nil, fmt.Errorf("database: schema init: %w", err)
	}

	slog.Info("database ready", "file", dbFile)
	return db, nil
}
