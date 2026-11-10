package database

import (
	"path/filepath"
	"testing"
)

func TestOpenInitializesEmptyDatabase(t *testing.T) {
	tempDB := filepath.Join(t.TempDir(), "test_empty.db")

	db, err := Open(tempDB)
	if err != nil {
		t.Fatalf("database.Open failed: %v", err)
	}
	defer db.Close()

	// Verify goal_assets table has allocation_percentage column
	var count int
	err = db.QueryRow("SELECT COUNT(*) FROM pragma_table_info('goal_assets') WHERE name = 'allocation_percentage'").Scan(&count)
	if err != nil {
		t.Fatalf("failed to query pragma_table_info: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected allocation_percentage column in goal_assets, got count %d", count)
	}
}
