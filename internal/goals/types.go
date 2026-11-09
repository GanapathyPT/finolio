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

