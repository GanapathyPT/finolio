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
	DisplayOrder int64       `json:"display_order"`
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
	DisplayOrder *int64   `json:"display_order,omitempty"`
}

// UpdateGoalRequest is the payload for updating an existing goal.
type UpdateGoalRequest struct {
	ParentID     *int64   `json:"parent_id"`
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	TargetAmount *float64 `json:"target_amount"`
	TargetDate   *string  `json:"target_date"`
	DisplayOrder *int64   `json:"display_order,omitempty"`
}

// ReorderGoalItem represents a single goal order update.
type ReorderGoalItem struct {
	ID           int64 `json:"id"`
	DisplayOrder int64 `json:"display_order"`
}

// ReorderGoalsRequest is the payload for bulk updating goal priorities.
type ReorderGoalsRequest struct {
	Orders []ReorderGoalItem `json:"orders"`
}

// AssignAssetRequest is the payload for assigning or unassigning an asset to/from a goal.
type AssignAssetRequest struct {
	AssetType            string `json:"asset_type"`                      // "equity" or "mf"
	AssetKey             string `json:"asset_key"`                       // e.g. "INFY:NSE" or "folio:fund"
	GoalID               *int64 `json:"goal_id"`                         // target goal id, or nil to unassign from all goals
	AllocationPercentage *int64 `json:"allocation_percentage,omitempty"` // 10 to 100 in multiples of 10. If 0 with GoalID, unassigns from that goal. If nil, defaults to 100.
}
