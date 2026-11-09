package goals

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/ganapathypt/finolio/internal/database"
	"github.com/ganapathypt/finolio/internal/store"
)

func TestGoalsHierarchyAndDefaults(t *testing.T) {
	tempDB := filepath.Join(t.TempDir(), "test_goals.db")
	db, err := database.Open(tempDB)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	queries := store.New(db)
	ctx := context.Background()

	// Create user
	user, err := queries.UpsertUser(ctx, store.UpsertUserParams{
		KiteID:   "GOAL01",
		UserName: "Goal User",
		Email:    "goal@example.com",
	})
	if err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	service := NewService(db, queries)

	// 1. Initial tree request should auto-seed Safety Net and FIRE
	roots, err := service.GetGoalsTree(ctx, user.ID)
	if err != nil {
		t.Fatalf("failed to get goals tree: %v", err)
	}
	if len(roots) != 2 {
		t.Fatalf("expected 2 default root goals, got %d", len(roots))
	}

	var fireGoal *GoalNode
	var safetyNetGoal *GoalNode
	for _, r := range roots {
		if r.Title == "FIRE" {
			fireGoal = r
		} else if r.Title == "Safety Net" {
			safetyNetGoal = r
		}
	}

	if fireGoal == nil {
		t.Fatal("expected default 'FIRE' goal to be present")
	}
	if safetyNetGoal == nil {
		t.Fatal("expected default 'Safety Net' goal to be present")
	}

	// 2. Create sub-goal under FIRE
	targetAmt := 15000000.0 // 1.5 Cr
	targetDate := "2035-12-31"
	subGoal, err := service.CreateGoal(ctx, user.ID, CreateGoalRequest{
		ParentID:     &fireGoal.ID,
		Title:        "Lean FIRE",
		Description:  "Basic living expenses covered by dividend and safe withdrawal cash flow.",
		TargetAmount: &targetAmt,
		TargetDate:   &targetDate,
	})
	if err != nil {
		t.Fatalf("failed to create sub-goal: %v", err)
	}
	if subGoal.ParentID == nil || *subGoal.ParentID != fireGoal.ID {
		t.Fatalf("expected sub-goal parent_id to match FIRE goal id %d", fireGoal.ID)
	}

	// 3. Create sub-sub-goal under Lean FIRE (nested hierarchy)
	nestAmt := 5000000.0
	nestSubGoal, err := service.CreateGoal(ctx, user.ID, CreateGoalRequest{
		ParentID:     &subGoal.ID,
		Title:        "Debt-Free Living Milestone",
		Description:  "All home and vehicle liabilities cleared.",
		TargetAmount: &nestAmt,
	})
	if err != nil {
		t.Fatalf("failed to create nested sub-goal: %v", err)
	}

	// 4. Retrieve tree and verify nesting
	tree, err := service.GetGoalsTree(ctx, user.ID)
	if err != nil {
		t.Fatalf("failed to get updated tree: %v", err)
	}
	if len(tree) != 2 {
		t.Fatalf("expected still 2 root goals, got %d", len(tree))
	}

	var updatedFire *GoalNode
	for _, r := range tree {
		if r.Title == "FIRE" {
			updatedFire = r
			break
		}
	}
	if len(updatedFire.Children) != 1 {
		t.Fatalf("expected 1 child under FIRE, got %d", len(updatedFire.Children))
	}
	child := updatedFire.Children[0]
	if child.Title != "Lean FIRE" {
		t.Errorf("expected child title 'Lean FIRE', got %s", child.Title)
	}
	if len(child.Children) != 1 {
		t.Fatalf("expected 1 nested child under Lean FIRE, got %d", len(child.Children))
	}
	if child.Children[0].Title != "Debt-Free Living Milestone" {
		t.Errorf("expected nested child title 'Debt-Free Living Milestone', got %s", child.Children[0].Title)
	}

	// 5. Update goal
	newTitle := "Coast FIRE"
	updated, err := service.UpdateGoal(ctx, user.ID, subGoal.ID, UpdateGoalRequest{
		ParentID:     &fireGoal.ID,
		Title:        newTitle,
		Description:  subGoal.Description,
		TargetAmount: subGoal.TargetAmount,
		TargetDate:   subGoal.TargetDate,
	})
	if err != nil {
		t.Fatalf("failed to update goal: %v", err)
	}
	if updated.Title != newTitle {
		t.Errorf("expected updated title %s, got %s", newTitle, updated.Title)
	}

	// 6. Delete sub-goal (should cascade delete nested child)
	if err := service.DeleteGoal(ctx, user.ID, subGoal.ID); err != nil {
		t.Fatalf("failed to delete sub-goal: %v", err)
	}

	// Verify nested child is also deleted
	_, err = service.GetGoalByID(ctx, user.ID, nestSubGoal.ID)
	if err == nil {
		t.Fatal("expected nested sub-goal to be deleted via cascade")
	}
}

func TestGoalsValidation(t *testing.T) {
	tempDB := filepath.Join(t.TempDir(), "test_goals_val.db")
	db, err := database.Open(tempDB)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	queries := store.New(db)
	ctx := context.Background()

	user, err := queries.UpsertUser(ctx, store.UpsertUserParams{
		KiteID:   "GOAL02",
		UserName: "Validation User",
		Email:    "val@example.com",
	})
	if err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	service := NewService(db, queries)

	// Missing title
	_, err = service.CreateGoal(ctx, user.ID, CreateGoalRequest{
		Title: "",
	})
	if err == nil {
		t.Fatal("expected error on empty title, got nil")
	}

	// Non-existent parent_id
	invalidParent := int64(99999)
	_, err = service.CreateGoal(ctx, user.ID, CreateGoalRequest{
		ParentID: &invalidParent,
		Title:    "Invalid Subgoal",
	})
	if err == nil {
		t.Fatal("expected error on invalid parent_id, got nil")
	}
}

