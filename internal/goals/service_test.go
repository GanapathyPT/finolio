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

func TestGoalAssetTagging(t *testing.T) {
	tempDB := filepath.Join(t.TempDir(), "test_assets.db")
	db, err := database.Open(tempDB)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	queries := store.New(db)
	ctx := context.Background()

	user, err := queries.UpsertUser(ctx, store.UpsertUserParams{
		KiteID:   "GOAL03",
		UserName: "Tag User",
		Email:    "tag@example.com",
	})
	if err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	service := NewService(db, queries)

	// Ensure default goals exist
	roots, err := service.GetGoalsTree(ctx, user.ID)
	if err != nil || len(roots) < 2 {
		t.Fatalf("failed to get default goals")
	}
	goalID := roots[0].ID

	// 1. Assign equity asset to goal
	err = service.AssignAsset(ctx, user.ID, AssignAssetRequest{
		AssetType: "equity",
		AssetKey:  "INFY:NSE",
		GoalID:    &goalID,
	})
	if err != nil {
		t.Fatalf("failed to assign asset: %v", err)
	}

	// 2. Query goal assets
	assets, err := service.GetGoalAssets(ctx, user.ID)
	if err != nil {
		t.Fatalf("failed to get goal assets: %v", err)
	}
	if len(assets) != 1 || assets[0].GoalID != goalID || assets[0].AssetKey != "INFY:NSE" || assets[0].AllocationPercentage != 100 {
		t.Fatalf("unexpected goal assets: %+v", assets)
	}

	// 3. Unassign from first goal then assign to other goal
	err = service.AssignAsset(ctx, user.ID, AssignAssetRequest{
		AssetType:            "equity",
		AssetKey:             "INFY:NSE",
		GoalID:               &goalID,
		AllocationPercentage: ptrInt64(0),
	})
	if err != nil {
		t.Fatalf("failed to unassign asset from specific goal: %v", err)
	}

	otherGoalID := roots[1].ID
	err = service.AssignAsset(ctx, user.ID, AssignAssetRequest{
		AssetType: "equity",
		AssetKey:  "INFY:NSE",
		GoalID:    &otherGoalID,
	})
	if err != nil {
		t.Fatalf("failed to reassign asset: %v", err)
	}

	assets, err = service.GetGoalAssets(ctx, user.ID)
	if err != nil || len(assets) != 1 || assets[0].GoalID != otherGoalID {
		t.Fatalf("expected asset moved to other goal, got %+v", assets)
	}

	// 4. Unassign asset from all goals (goal_id = nil) -> moves back to dangling
	err = service.AssignAsset(ctx, user.ID, AssignAssetRequest{
		AssetType: "equity",
		AssetKey:  "INFY:NSE",
		GoalID:    nil,
	})
	if err != nil {
		t.Fatalf("failed to unassign asset: %v", err)
	}

	assets, err = service.GetGoalAssets(ctx, user.ID)
	if err != nil || len(assets) != 0 {
		t.Fatalf("expected 0 goal assets after unassign, got %+v", assets)
	}
}

func ptrInt64(v int64) *int64 {
	return &v
}

func TestSplitAssetAcrossMultipleGoals(t *testing.T) {
	tempDB := filepath.Join(t.TempDir(), "test_split_goals.db")
	db, err := database.Open(tempDB)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	queries := store.New(db)
	ctx := context.Background()

	user, err := queries.UpsertUser(ctx, store.UpsertUserParams{
		KiteID:   "SPLIT01",
		UserName: "Split User",
		Email:    "split@example.com",
	})
	if err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	service := NewService(db, queries)

	roots, err := service.GetGoalsTree(ctx, user.ID)
	if err != nil || len(roots) < 2 {
		t.Fatalf("failed to get default goals")
	}
	goal1ID := roots[0].ID
	goal2ID := roots[1].ID

	// 1. Validation: Reject split < 10%
	err = service.AssignAsset(ctx, user.ID, AssignAssetRequest{
		AssetType:            "equity",
		AssetKey:             "TCS:NSE",
		GoalID:               &goal1ID,
		AllocationPercentage: ptrInt64(5),
	})
	if err == nil {
		t.Fatal("expected error for allocation < 10%, got nil")
	}

	// 2. Validation: Reject split not in multiples of 10
	err = service.AssignAsset(ctx, user.ID, AssignAssetRequest{
		AssetType:            "equity",
		AssetKey:             "TCS:NSE",
		GoalID:               &goal1ID,
		AllocationPercentage: ptrInt64(25),
	})
	if err == nil {
		t.Fatal("expected error for allocation not in multiple of 10 (25%), got nil")
	}

	// 3. Assign 60% of TCS:NSE to Goal 1
	err = service.AssignAsset(ctx, user.ID, AssignAssetRequest{
		AssetType:            "equity",
		AssetKey:             "TCS:NSE",
		GoalID:               &goal1ID,
		AllocationPercentage: ptrInt64(60),
	})
	if err != nil {
		t.Fatalf("failed to assign 60%% to goal 1: %v", err)
	}

	// 4. Assign 40% of TCS:NSE to Goal 2
	err = service.AssignAsset(ctx, user.ID, AssignAssetRequest{
		AssetType:            "equity",
		AssetKey:             "TCS:NSE",
		GoalID:               &goal2ID,
		AllocationPercentage: ptrInt64(40),
	})
	if err != nil {
		t.Fatalf("failed to assign 40%% to goal 2: %v", err)
	}

	// 5. Query allocations: both goals should hold TCS
	allocs, err := queries.GetAssetAllocations(ctx, store.GetAssetAllocationsParams{
		UserID:    user.ID,
		AssetType: "equity",
		AssetKey:  "TCS:NSE",
	})
	if err != nil {
		t.Fatalf("failed to get allocations: %v", err)
	}
	if len(allocs) != 2 {
		t.Fatalf("expected 2 allocations, got %d", len(allocs))
	}
	var totalAlloc int64
	for _, a := range allocs {
		totalAlloc += a.AllocationPercentage
	}
	if totalAlloc != 100 {
		t.Fatalf("expected total allocation to equal 100, got %d", totalAlloc)
	}

	// 6. Attempt to assign an additional 10% to another sub-goal (exceeding 100%)
	subGoal, err := service.CreateGoal(ctx, user.ID, CreateGoalRequest{
		ParentID: &goal1ID,
		Title:    "Emergency Cash Fund",
	})
	if err != nil {
		t.Fatalf("failed to create sub-goal: %v", err)
	}

	err = service.AssignAsset(ctx, user.ID, AssignAssetRequest{
		AssetType:            "equity",
		AssetKey:             "TCS:NSE",
		GoalID:               &subGoal.ID,
		AllocationPercentage: ptrInt64(10),
	})
	if err == nil {
		t.Fatal("expected error when total allocation exceeds 100%, got nil")
	}

	// 7. Reduce Goal 1 from 60% to 30% -> frees up 30%
	err = service.AssignAsset(ctx, user.ID, AssignAssetRequest{
		AssetType:            "equity",
		AssetKey:             "TCS:NSE",
		GoalID:               &goal1ID,
		AllocationPercentage: ptrInt64(30),
	})
	if err != nil {
		t.Fatalf("failed to update Goal 1 allocation to 30%%: %v", err)
	}

	// 8. Now assigning 20% to subGoal should succeed
	err = service.AssignAsset(ctx, user.ID, AssignAssetRequest{
		AssetType:            "equity",
		AssetKey:             "TCS:NSE",
		GoalID:               &subGoal.ID,
		AllocationPercentage: ptrInt64(20),
	})
	if err != nil {
		t.Fatalf("failed to assign 20%% to subGoal after freeing headroom: %v", err)
	}

	// 9. Remove from Goal 2 (AllocationPercentage = 0)
	err = service.AssignAsset(ctx, user.ID, AssignAssetRequest{
		AssetType:            "equity",
		AssetKey:             "TCS:NSE",
		GoalID:               &goal2ID,
		AllocationPercentage: ptrInt64(0),
	})
	if err != nil {
		t.Fatalf("failed to unassign from Goal 2: %v", err)
	}

	allocsAfter, err := queries.GetAssetAllocations(ctx, store.GetAssetAllocationsParams{
		UserID:    user.ID,
		AssetType: "equity",
		AssetKey:  "TCS:NSE",
	})
	if err != nil {
		t.Fatalf("failed to get allocations: %v", err)
	}
	if len(allocsAfter) != 2 { // Goal 1 (30%) + subGoal (20%) = 50%
		t.Fatalf("expected 2 remaining allocations, got %d", len(allocsAfter))
	}
}

func TestReorderGoals(t *testing.T) {
	tempDB := filepath.Join(t.TempDir(), "test_reorder.db")
	db, err := database.Open(tempDB)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	queries := store.New(db)
	ctx := context.Background()

	user, err := queries.UpsertUser(ctx, store.UpsertUserParams{
		KiteID:   "REORDER01",
		UserName: "Reorder User",
		Email:    "reorder@example.com",
	})
	if err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	service := NewService(db, queries)
	roots, err := service.GetGoalsTree(ctx, user.ID)
	if err != nil {
		t.Fatalf("failed to get goals tree: %v", err)
	}
	fireGoal := roots[0]

	// Create 3 sub-goals
	target1 := 100000.0
	target2 := 200000.0
	target3 := 300000.0

	sub1, err := service.CreateGoal(ctx, user.ID, CreateGoalRequest{
		ParentID:     &fireGoal.ID,
		Title:        "Priority 1 Subgoal",
		TargetAmount: &target1,
		DisplayOrder: ptrInt64(0),
	})
	if err != nil {
		t.Fatalf("failed to create sub1: %v", err)
	}

	sub2, err := service.CreateGoal(ctx, user.ID, CreateGoalRequest{
		ParentID:     &fireGoal.ID,
		Title:        "Priority 2 Subgoal",
		TargetAmount: &target2,
		DisplayOrder: ptrInt64(1),
	})
	if err != nil {
		t.Fatalf("failed to create sub2: %v", err)
	}

	sub3, err := service.CreateGoal(ctx, user.ID, CreateGoalRequest{
		ParentID:     &fireGoal.ID,
		Title:        "Priority 3 Subgoal",
		TargetAmount: &target3,
		DisplayOrder: ptrInt64(2),
	})
	if err != nil {
		t.Fatalf("failed to create sub3: %v", err)
	}

	// Reorder sub3 to top priority, sub1 to bottom
	err = service.ReorderGoals(ctx, user.ID, ReorderGoalsRequest{
		Orders: []ReorderGoalItem{
			{ID: sub3.ID, DisplayOrder: 0},
			{ID: sub2.ID, DisplayOrder: 1},
			{ID: sub1.ID, DisplayOrder: 2},
		},
	})
	if err != nil {
		t.Fatalf("failed to reorder goals: %v", err)
	}

	tree, err := service.GetGoalsTree(ctx, user.ID)
	if err != nil {
		t.Fatalf("failed to get tree: %v", err)
	}

	var updatedRoot *GoalNode
	for _, r := range tree {
		if r.ID == fireGoal.ID {
			updatedRoot = r
			break
		}
	}
	if updatedRoot == nil || len(updatedRoot.Children) != 3 {
		t.Fatalf("expected 3 children under root")
	}

	if updatedRoot.Children[0].ID != sub3.ID || updatedRoot.Children[0].DisplayOrder != 0 {
		t.Errorf("expected first child to be sub3 (id %d), got id %d", sub3.ID, updatedRoot.Children[0].ID)
	}
	if updatedRoot.Children[1].ID != sub2.ID || updatedRoot.Children[1].DisplayOrder != 1 {
		t.Errorf("expected second child to be sub2 (id %d), got id %d", sub2.ID, updatedRoot.Children[1].ID)
	}
	if updatedRoot.Children[2].ID != sub1.ID || updatedRoot.Children[2].DisplayOrder != 2 {
		t.Errorf("expected third child to be sub1 (id %d), got id %d", sub1.ID, updatedRoot.Children[2].ID)
	}
}
