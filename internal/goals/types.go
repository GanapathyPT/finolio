package goals

import (
	"time"
)

// GoalNode represents a goal in the hierarchical tree structure.
type GoalNode struct {
	ID           int64       `json:"id"`
	UserID       int64       `json:"user_id"`
	ParentID     *int64      `json:"parent_id"`
	Title        string      `json:"title"`
	Description  string      `json:"description"`
	TargetAmount *float64    `json:"target_amount"`
	TargetDate   *string     `json:"target_date"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
	Children     []*GoalNode `json:"children,omitempty"`
}

// CreateGoalRequest is the payload for creating a goal or sub-goal.
type CreateGoalRequest struct {
	ParentID     *int64   `json:"parent_id"`
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	TargetAmount *float64 `json:"target_amount"`
	TargetDate   *string  `json:"target_date"`
}

// UpdateGoalRequest is the payload for updating an existing goal.
type UpdateGoalRequest struct {
	ParentID     *int64   `json:"parent_id"`
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	TargetAmount *float64 `json:"target_amount"`
	TargetDate   *string  `json:"target_date"`
}

// AssignAssetRequest is the payload for assigning or unassigning an asset to/from a goal.
type AssignAssetRequest struct {
	AssetType string `json:"asset_type"` // "equity" or "mf"
	AssetKey  string `json:"asset_key"`  // e.g. "INFY:NSE" or "folio:fund"
	GoalID    *int64 `json:"goal_id"`    // if nil, unassigns from goal (moves to dangling)
}
