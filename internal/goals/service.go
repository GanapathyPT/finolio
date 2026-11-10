package goals

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/ganapathypt/finolio/internal/store"
)

// Service provides operations for managing financial goals and their tree hierarchy.
type Service struct {
	db      *sql.DB
	queries *store.Queries
}

// NewService constructs a new goals Service.
func NewService(db *sql.DB, queries *store.Queries) *Service {
	return &Service{
		db:      db,
		queries: queries,
	}
}

// EnsureDefaultGoals seeds the 2 default root goals ("Safety Net" and "FIRE") if the user has 0 goals.
func (s *Service) EnsureDefaultGoals(ctx context.Context, userID int64) error {
	count, err := s.queries.CountGoalsByUserID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to check existing goals: %w", err)
	}
	if count > 0 {
		return nil
	}

	// 1. Safety Net
	_, err = s.queries.CreateGoal(ctx, store.CreateGoalParams{
		UserID:       userID,
		ParentID:     nil,
		Title:        "Safety Net",
		Description:  "6–12 months of essential living expenses set aside in liquid assets for unforeseen emergencies.",
		TargetAmount: nil,
		TargetDate:   nil,
	})
	if err != nil {
		return fmt.Errorf("failed to create default Safety Net goal: %w", err)
	}

	// 2. FIRE
	_, err = s.queries.CreateGoal(ctx, store.CreateGoalParams{
		UserID:       userID,
		ParentID:     nil,
		Title:        "FIRE",
		Description:  "Financial Independence / Retire Early corpus to generate passive cash flow and make work optional.",
		TargetAmount: nil,
		TargetDate:   nil,
	})
	if err != nil {
		return fmt.Errorf("failed to create default FIRE goal: %w", err)
	}

	return nil
}

// GetGoalsTree returns all goals for the user assembled into a hierarchical tree structure.
func (s *Service) GetGoalsTree(ctx context.Context, userID int64) ([]*GoalNode, error) {
	if err := s.EnsureDefaultGoals(ctx, userID); err != nil {
		return nil, err
	}

	rawGoals, err := s.queries.ListGoalsByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to list goals: %w", err)
	}

	nodeMap := make(map[int64]*GoalNode, len(rawGoals))
	for _, g := range rawGoals {
		nodeMap[g.ID] = toGoalNode(g)
	}

	var roots []*GoalNode
	for _, g := range rawGoals {
		node := nodeMap[g.ID]
		if node.ParentID != nil {
			parent, exists := nodeMap[*node.ParentID]
			if exists {
				parent.Children = append(parent.Children, node)
				continue
			}
		}
		roots = append(roots, node)
	}

	if roots == nil {
		roots = make([]*GoalNode, 0)
	}

	return roots, nil
}

// CreateGoal creates a new goal or sub-goal.
func (s *Service) CreateGoal(ctx context.Context, userID int64, req CreateGoalRequest) (*GoalNode, error) {
	if req.Title == "" {
		return nil, errors.New("title is required")
	}

	if req.ParentID != nil {
		// Verify parent exists and belongs to this user
		_, err := s.queries.GetGoalByID(ctx, store.GetGoalByIDParams{
			ID:     *req.ParentID,
			UserID: userID,
		})
		if err != nil {
			return nil, fmt.Errorf("invalid parent_id: parent goal not found: %w", err)
		}
	}

	var parentIDVal any
	if req.ParentID != nil {
		parentIDVal = *req.ParentID
	}
	var targetAmountVal any
	if req.TargetAmount != nil {
		targetAmountVal = *req.TargetAmount
	}
	var targetDateVal any
	if req.TargetDate != nil {
		targetDateVal = *req.TargetDate
	}

	created, err := s.queries.CreateGoal(ctx, store.CreateGoalParams{
		UserID:       userID,
		ParentID:     parentIDVal,
		Title:        req.Title,
		Description:  req.Description,
		TargetAmount: targetAmountVal,
		TargetDate:   targetDateVal,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create goal: %w", err)
	}

	return toGoalNode(created), nil
}

// GetGoalByID returns a single goal by its ID.
func (s *Service) GetGoalByID(ctx context.Context, userID, goalID int64) (*GoalNode, error) {
	g, err := s.queries.GetGoalByID(ctx, store.GetGoalByIDParams{
		ID:     goalID,
		UserID: userID,
	})
	if err != nil {
		return nil, err
	}
	return toGoalNode(g), nil
}

// UpdateGoal updates an existing goal.
func (s *Service) UpdateGoal(ctx context.Context, userID, goalID int64, req UpdateGoalRequest) (*GoalNode, error) {
	if req.Title == "" {
		return nil, errors.New("title is required")
	}

	if req.ParentID != nil {
		if *req.ParentID == goalID {
			return nil, errors.New("a goal cannot be its own parent")
		}
		// Verify parent exists and belongs to this user
		_, err := s.queries.GetGoalByID(ctx, store.GetGoalByIDParams{
			ID:     *req.ParentID,
			UserID: userID,
		})
		if err != nil {
			return nil, fmt.Errorf("invalid parent_id: parent goal not found: %w", err)
		}
	}

	var parentIDVal any
	if req.ParentID != nil {
		parentIDVal = *req.ParentID
	}
	var targetAmountVal any
	if req.TargetAmount != nil {
		targetAmountVal = *req.TargetAmount
	}
	var targetDateVal any
	if req.TargetDate != nil {
		targetDateVal = *req.TargetDate
	}

	updated, err := s.queries.UpdateGoal(ctx, store.UpdateGoalParams{
		ID:           goalID,
		UserID:       userID,
		ParentID:     parentIDVal,
		Title:        req.Title,
		Description:  req.Description,
		TargetAmount: targetAmountVal,
		TargetDate:   targetDateVal,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to update goal: %w", err)
	}

	return toGoalNode(updated), nil
}

// DeleteGoal deletes a goal and automatically cascades to any sub-goals.
func (s *Service) DeleteGoal(ctx context.Context, userID, goalID int64) error {
	return s.queries.DeleteGoal(ctx, store.DeleteGoalParams{
		ID:     goalID,
		UserID: userID,
	})
}

// AssignAsset assigns an equity or MF asset to a goal, or unassigns it if goal_id is nil or allocation_percentage is 0.
func (s *Service) AssignAsset(ctx context.Context, userID int64, req AssignAssetRequest) error {
	if req.AssetType != "equity" && req.AssetType != "mf" {
		return errors.New("asset_type must be 'equity' or 'mf'")
	}
	if req.AssetKey == "" {
		return errors.New("asset_key is required")
	}

	if req.GoalID == nil {
		return s.queries.UnassignAssetFromAllGoals(ctx, store.UnassignAssetFromAllGoalsParams{
			UserID:    userID,
			AssetType: req.AssetType,
			AssetKey:  req.AssetKey,
		})
	}

	// Verify goal exists and belongs to user
	_, err := s.queries.GetGoalByID(ctx, store.GetGoalByIDParams{
		ID:     *req.GoalID,
		UserID: userID,
	})
	if err != nil {
		return fmt.Errorf("target goal not found: %w", err)
	}

	// If AllocationPercentage is explicitly 0, unassign from this specific goal
	if req.AllocationPercentage != nil && *req.AllocationPercentage == 0 {
		return s.queries.UnassignAssetFromGoal(ctx, store.UnassignAssetFromGoalParams{
			UserID:    userID,
			GoalID:    *req.GoalID,
			AssetType: req.AssetType,
			AssetKey:  req.AssetKey,
		})
	}

	allocation := int64(100)
	if req.AllocationPercentage != nil {
		allocation = *req.AllocationPercentage
	}

	if allocation < 10 || allocation > 100 || allocation%10 != 0 {
		return errors.New("allocation percentage must be at least 10% and in multiples of 10")
	}

	// Check total allocation across other goals
	existingAllocs, err := s.queries.GetAssetAllocations(ctx, store.GetAssetAllocationsParams{
		UserID:    userID,
		AssetType: req.AssetType,
		AssetKey:  req.AssetKey,
	})
	if err != nil {
		return fmt.Errorf("failed to check existing asset allocations: %w", err)
	}

	var otherAllocTotal int64
	for _, ea := range existingAllocs {
		if ea.GoalID != *req.GoalID {
			otherAllocTotal += ea.AllocationPercentage
		}
	}

	if otherAllocTotal+allocation > 100 {
		return fmt.Errorf("total allocation cannot exceed 100%% (%d%% is already allocated to other goals)", otherAllocTotal)
	}

	_, err = s.queries.AssignAssetToGoal(ctx, store.AssignAssetToGoalParams{
		UserID:               userID,
		GoalID:               *req.GoalID,
		AssetType:            req.AssetType,
		AssetKey:             req.AssetKey,
		AllocationPercentage: allocation,
	})
	if err != nil {
		return fmt.Errorf("failed to assign asset to goal: %w", err)
	}

	return nil
}

// GetGoalAssets returns all asset-to-goal mappings for the user.
func (s *Service) GetGoalAssets(ctx context.Context, userID int64) ([]store.GoalAsset, error) {
	return s.queries.ListGoalAssetsByUserID(ctx, userID)
}

func toGoalNode(g store.Goal) *GoalNode {
	node := &GoalNode{
		ID:          g.ID,
		UserID:      g.UserID,
		Title:       g.Title,
		Description: g.Description,
		CreatedAt:   g.CreatedAt,
		UpdatedAt:   g.UpdatedAt,
		Children:    make([]*GoalNode, 0),
	}

	if g.ParentID != nil {
		if pid, ok := g.ParentID.(int64); ok {
			node.ParentID = &pid
		}
	}
	if g.TargetAmount != nil {
		if amt, ok := g.TargetAmount.(float64); ok {
			node.TargetAmount = &amt
		}
	}
	if g.TargetDate != nil {
		if dt, ok := g.TargetDate.(string); ok && dt != "" {
			node.TargetDate = &dt
		}
	}

	return node
}
