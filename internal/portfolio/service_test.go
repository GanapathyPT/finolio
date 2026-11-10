package portfolio

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	kiteconnect "github.com/zerodha/gokiteconnect/v4"

	"github.com/ganapathypt/finolio/internal/database"
	"github.com/ganapathypt/finolio/internal/store"
)

type mockKiteClient struct {
	holdings      kiteconnect.Holdings
	holdingsErr   error
	mf            kiteconnect.MFHoldings
	mfErr         error
	holdingsCalls int
	mfCalls       int
}

func (m *mockKiteClient) GetHoldings() (kiteconnect.Holdings, error) {
	m.holdingsCalls++
	return m.holdings, m.holdingsErr
}

func (m *mockKiteClient) GetMFHoldings() (kiteconnect.MFHoldings, error) {
	m.mfCalls++
	return m.mf, m.mfErr
}

func TestPortfolioSyncBothSegmentsSuccess(t *testing.T) {
	tempDB := filepath.Join(t.TempDir(), "test_portfolio.db")
	db, err := database.Open(tempDB)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	queries := store.New(db)
	ctx := context.Background()

	// 1. Create mock user and session
	user, err := queries.UpsertUser(ctx, store.UpsertUserParams{
		KiteID:   "AB1234",
		UserName: "Test Investor",
		Email:    "investor@example.com",
	})
	if err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	_, err = queries.UpsertKiteSession(ctx, store.UpsertKiteSessionParams{
		UserID:      user.ID,
		AccessToken: "mock-access-token",
		PublicToken: "mock-public-token",
		LoginTime:   time.Now().UTC(),
	})
	if err != nil {
		t.Fatalf("failed to create session: %v", err)
	}

	// 2. Prepare mock Kite data
	mockData := &mockKiteClient{
		holdings: kiteconnect.Holdings{
			{
				Tradingsymbol:       "INFY",
				Exchange:            "NSE",
				InstrumentToken:     408065,
				ISIN:                "INE009A01021",
				Product:             "CNC",
				Quantity:            10,
				AveragePrice:        1400.0,
				LastPrice:           1500.0,
				ClosePrice:          1480.0,
				PnL:                 1000.0,
				DayChange:           20.0,
				DayChangePercentage: 1.35,
			},
		},
		mf: kiteconnect.MFHoldings{
			{
				Folio:         "12345/67",
				Fund:          "Parag Parikh Flexi Cap Fund",
				Tradingsymbol: "INF209K01168",
				AveragePrice:  50.0,
				LastPrice:     65.0,
				Quantity:      200.0,
				Pnl:           3000.0,
			},
		},
	}

	factory := func(apiKey, accessToken string) KiteClient {
		return mockData
	}

	service := NewService(db, queries, "dummy-key", factory)

	// 3. Run Sync
	res, err := service.Sync(ctx, user.ID)
	if err != nil {
		t.Fatalf("portfolio sync failed: %v", err)
	}

	// Verify single call per endpoint, no retries
	if mockData.holdingsCalls != 1 || mockData.mfCalls != 1 {
		t.Errorf("expected exactly 1 call per endpoint without retry, got holdings=%d mf=%d", mockData.holdingsCalls, mockData.mfCalls)
	}

	// Equity: 10 * 1400 = 14,000, MF: 200 * 50 = 10,000. Total = 24,000
	if res.Summary.TotalInvestment != 24000.0 {
		t.Errorf("expected total investment 24000.0, got %f", res.Summary.TotalInvestment)
	}
	// Equity: 10 * 1500 = 15,000, MF: 200 * 65 = 13,000. Total = 28,000
	if res.Summary.CurrentValue != 28000.0 {
		t.Errorf("expected current value 28000.0, got %f", res.Summary.CurrentValue)
	}
	// Total PnL: 1000 + 3000 = 4000
	if res.Summary.TotalPnL != 4000.0 {
		t.Errorf("expected total PnL 4000.0, got %f", res.Summary.TotalPnL)
	}

	if len(res.EquityHoldings) != 1 || len(res.MFHoldings) != 1 {
		t.Errorf("expected 1 equity holding and 1 mf holding, got eq=%d mf=%d", len(res.EquityHoldings), len(res.MFHoldings))
	}

	// 4. Verify successful snapshot in DB
	snapshots, err := service.GetHistory(ctx, user.ID, 10)
	if err != nil {
		t.Fatalf("failed to get history: %v", err)
	}
	if len(snapshots) != 1 {
		t.Fatalf("expected 1 snapshot, got %d", len(snapshots))
	}
	if snapshots[0].Status != "success" {
		t.Errorf("expected status 'success', got %s", snapshots[0].Status)
	}
	if snapshots[0].CurrentValue != 28000.0 {
		t.Errorf("expected snapshot value 28000.0, got %f", snapshots[0].CurrentValue)
	}
}

func TestPortfolioSyncFailureSavesFailedSnapshotNoRetry(t *testing.T) {
	tempDB := filepath.Join(t.TempDir(), "test_fail.db")
	db, err := database.Open(tempDB)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	queries := store.New(db)
	ctx := context.Background()

	user, err := queries.UpsertUser(ctx, store.UpsertUserParams{
		KiteID:   "FAIL01",
		UserName: "Fail User",
		Email:    "fail@example.com",
	})
	if err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	_, err = queries.UpsertKiteSession(ctx, store.UpsertKiteSessionParams{
		UserID:      user.ID,
		AccessToken: "mock-access-token",
		PublicToken: "mock-public-token",
		LoginTime:   time.Now().UTC(),
	})
	if err != nil {
		t.Fatalf("failed to create session: %v", err)
	}

	// Equity succeeds, but Mutual Funds fails
	mockData := &mockKiteClient{
		holdings: kiteconnect.Holdings{
			{
				Tradingsymbol: "INFY",
				Quantity:      10,
				AveragePrice:  1400.0,
				LastPrice:     1500.0,
			},
		},
		mfErr: errors.New("503 Service Unavailable"),
	}

	factory := func(apiKey, accessToken string) KiteClient {
		return mockData
	}

	service := NewService(db, queries, "dummy-key", factory)

	// Run Sync
	_, err = service.Sync(ctx, user.ID)
	if err == nil {
		t.Fatal("expected sync to return error when mutual funds call fails")
	}

	// Verify no retry was performed
	if mockData.mfCalls != 1 {
		t.Errorf("expected exactly 1 call without retry, got %d", mockData.mfCalls)
	}

	// Verify failed snapshot was recorded
	snapshots, err := service.GetHistory(ctx, user.ID, 10)
	if err != nil {
		t.Fatalf("failed to get history: %v", err)
	}
	if len(snapshots) != 1 {
		t.Fatalf("expected 1 failed snapshot saved, got %d", len(snapshots))
	}
	if snapshots[0].Status != "failed" {
		t.Errorf("expected snapshot status 'failed', got %s", snapshots[0].Status)
	}
	if snapshots[0].ErrorMessage == "" {
		t.Error("expected error message in failed snapshot, got empty")
	}
}

func TestPortfolioEnrichmentWithSplitAllocations(t *testing.T) {
	tempDB := filepath.Join(t.TempDir(), "test_split_portfolio.db")
	db, err := database.Open(tempDB)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	queries := store.New(db)
	ctx := context.Background()

	user, err := queries.UpsertUser(ctx, store.UpsertUserParams{
		KiteID:   "SPLIT_PORT01",
		UserName: "Split Investor",
		Email:    "split_investor@example.com",
	})
	if err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	_, err = queries.UpsertKiteSession(ctx, store.UpsertKiteSessionParams{
		UserID:      user.ID,
		AccessToken: "mock-access-token",
		PublicToken: "mock-public-token",
		LoginTime:   time.Now().UTC(),
	})
	if err != nil {
		t.Fatalf("failed to create session: %v", err)
	}

	mockData := &mockKiteClient{
		holdings: kiteconnect.Holdings{
			{
				Tradingsymbol:   "INFY",
				Exchange:        "NSE",
				InstrumentToken: 408065,
				ISIN:            "INE009A01021",
				Product:         "CNC",
				Quantity:        100,
				AveragePrice:    1400.0,
				LastPrice:       1500.0,
			},
		},
		mf: kiteconnect.MFHoldings{
			{
				Folio:         "12345/67",
				Fund:          "Parag Parikh Flexi Cap Fund",
				Tradingsymbol: "INF209K01168",
				AveragePrice:  50.0,
				LastPrice:     65.0,
				Quantity:      200.0,
			},
		},
	}

	factory := func(apiKey, accessToken string) KiteClient {
		return mockData
	}

	service := NewService(db, queries, "dummy-key", factory)

	// 1. Initial Sync
	_, err = service.Sync(ctx, user.ID)
	if err != nil {
		t.Fatalf("sync failed: %v", err)
	}

	// 2. Create goals
	g1, err := queries.CreateGoal(ctx, store.CreateGoalParams{
		UserID: user.ID,
		Title:  "Retirement",
	})
	if err != nil {
		t.Fatalf("create goal 1 failed: %v", err)
	}

	g2, err := queries.CreateGoal(ctx, store.CreateGoalParams{
		UserID: user.ID,
		Title:  "House Downpayment",
	})
	if err != nil {
		t.Fatalf("create goal 2 failed: %v", err)
	}

	// 3. Assign 70% of INFY to Goal 1, 30% to Goal 2
	_, err = queries.AssignAssetToGoal(ctx, store.AssignAssetToGoalParams{
		UserID:               user.ID,
		GoalID:               g1.ID,
		AssetType:            "equity",
		AssetKey:             "INFY:NSE",
		AllocationPercentage: 70,
	})
	if err != nil {
		t.Fatalf("assign 70%% failed: %v", err)
	}

	_, err = queries.AssignAssetToGoal(ctx, store.AssignAssetToGoalParams{
		UserID:               user.ID,
		GoalID:               g2.ID,
		AssetType:            "equity",
		AssetKey:             "INFY:NSE",
		AllocationPercentage: 30,
	})
	if err != nil {
		t.Fatalf("assign 30%% failed: %v", err)
	}

	// 4. Assign 40% of MF to Goal 1 (leaving 60% unallocated)
	_, err = queries.AssignAssetToGoal(ctx, store.AssignAssetToGoalParams{
		UserID:               user.ID,
		GoalID:               g1.ID,
		AssetType:            "mf",
		AssetKey:             "12345/67:Parag Parikh Flexi Cap Fund",
		AllocationPercentage: 40,
	})
	if err != nil {
		t.Fatalf("assign MF 40%% failed: %v", err)
	}

	// 5. Query portfolio and verify enrichment
	port, err := service.GetPortfolio(ctx, user.ID)
	if err != nil {
		t.Fatalf("GetPortfolio failed: %v", err)
	}

	if len(port.EquityHoldings) != 1 {
		t.Fatalf("expected 1 equity holding, got %d", len(port.EquityHoldings))
	}
	eq := port.EquityHoldings[0]
	if len(eq.Allocations) != 2 {
		t.Fatalf("expected 2 allocations for INFY, got %d", len(eq.Allocations))
	}
	if eq.TotalAllocatedPercent != 100 {
		t.Fatalf("expected 100%% total allocated for INFY, got %d", eq.TotalAllocatedPercent)
	}

	if len(port.MFHoldings) != 1 {
		t.Fatalf("expected 1 MF holding, got %d", len(port.MFHoldings))
	}
	mfItem := port.MFHoldings[0]
	if len(mfItem.Allocations) != 1 {
		t.Fatalf("expected 1 allocation for MF, got %d", len(mfItem.Allocations))
	}
	if mfItem.Allocations[0].AllocationPercentage != 40 {
		t.Fatalf("expected 40%% allocated for MF, got %d", mfItem.Allocations[0].AllocationPercentage)
	}
	if mfItem.TotalAllocatedPercent != 40 {
		t.Fatalf("expected 40%% total allocated for MF, got %d", mfItem.TotalAllocatedPercent)
	}
}
