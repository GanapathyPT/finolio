// Package db embeds and exports the raw database schema.
package db

import _ "embed"

// Schema contains all DDL table definitions and indexes for SQLite.
//
//go:embed schema.sql
var Schema string
