package portfolio

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	kiteconnect "github.com/zerodha/gokiteconnect/v4"

	"github.com/ganapathypt/finolio/internal/database"
	"github.com/ganapathypt/finolio/internal/store"
)

type mockKiteClient struct {
	holdings kiteconnect.Holdings
}

func (m *mockKiteClient) GetHoldings() (kiteconnect.Holdings, error) {
	return m.holdings, nil
}

func TestPortfolioSyncAndRetrieval(t *testing.T) {
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

	// 2. Prepare mock Kite holdings
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
			{
				Tradingsymbol:       "RELIANCE",
				Exchange:            "NSE",
				InstrumentToken:     738561,
				ISIN:                "INE002A01018",
				Product:             "CNC",
				Quantity:            5,
				AveragePrice:        2400.0,
				LastPrice:           2600.0,
				ClosePrice:          2550.0,
				PnL:                 1000.0,
				DayChange:           50.0,
				DayChangePercentage: 1.96,
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

	// Holdings investment: 10*1400 + 5*2400 = 14000 + 12000 = 26000
	if res.Summary.TotalInvestment != 26000.0 {
		t.Errorf("expected total investment 26000.0, got %f", res.Summary.TotalInvestment)
	}

	// Holdings current: 10*1500 + 5*2600 = 15000 + 13000 = 28000
	if res.Summary.CurrentValue != 28000.0 {
		t.Errorf("expected current value 28000.0, got %f", res.Summary.CurrentValue)
	}

	// Total PnL: 1000 + 1000 = 2000
	if res.Summary.TotalPnL != 2000.0 {
		t.Errorf("expected total PnL 2000.0, got %f", res.Summary.TotalPnL)
	}

	// Total PnL percentage: (2000 / 26000) * 100 = 7.69%
	if res.Summary.TotalPnLPercentage != 7.69 {
		t.Errorf("expected total PnL percentage 7.69, got %f", res.Summary.TotalPnLPercentage)
	}

	if len(res.Holdings) != 2 {
		t.Errorf("expected 2 holdings, got %d", len(res.Holdings))
	}

	// 4. Test GetPortfolio retrieval from DB
	cached, err := service.GetPortfolio(ctx, user.ID)
	if err != nil {
		t.Fatalf("failed to retrieve stored portfolio: %v", err)
	}
	if cached.Summary.CurrentValue != 28000.0 {
		t.Errorf("expected cached current value 28000.0, got %f", cached.Summary.CurrentValue)
	}

	// 5. Test GetHistory snapshot retrieval
	history, err := service.GetHistory(ctx, user.ID, 30)
	if err != nil {
		t.Fatalf("failed to retrieve history: %v", err)
	}
	if len(history) != 1 {
		t.Fatalf("expected 1 historical snapshot, got %d", len(history))
	}
	if history[0].CurrentValue != 28000.0 {
		t.Errorf("expected history current value 28000.0, got %f", history[0].CurrentValue)
	}
}

func TestPortfolioSyncNoSession(t *testing.T) {
	tempDB := filepath.Join(t.TempDir(), "test_nosession.db")
	db, err := database.Open(tempDB)
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	queries := store.New(db)
	service := NewService(db, queries, "dummy-key", nil)

	_, err = service.Sync(context.Background(), 9999)
	if err == nil {
		t.Fatal("expected error when syncing non-existent user/session, got nil")
	}
}
