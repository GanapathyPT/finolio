package portfolio

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"time"

	"github.com/ganapathypt/finolio/internal/store"
)

// Service coordinates fetching, storing, and computing holdings metrics across equity and mutual funds.
type Service struct {
	db            *sql.DB
	queries       *store.Queries
	apiKey        string
	clientFactory ClientFactoryFunc
}

// NewService constructs a Service with the given dependencies.
func NewService(db *sql.DB, queries *store.Queries, apiKey string, factory ClientFactoryFunc) *Service {
	if factory == nil {
		factory = DefaultClientFactory
	}
	return &Service{
		db:            db,
		queries:       queries,
		apiKey:        apiKey,
		clientFactory: factory,
	}
}

// Sync connects to Zerodha Kite strictly on-demand, retrieves both equity holdings and mutual funds,
// and saves them into the local database as a single combined snapshot.
// If either API call fails, a failed snapshot is recorded without retries, preserving existing holdings.
func (s *Service) Sync(ctx context.Context, userID int64) (*PortfolioResponse, error) {
	session, err := s.queries.GetKiteSessionByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("kite session not found: %w", err)
	}
	if session.AccessToken == "" {
		return nil, errors.New("kite access token is empty, please sign in")
	}

	client := s.clientFactory(s.apiKey, session.AccessToken)

	// 1. Fetch equity segment holdings from Kite
	slog.Info("sync: requesting equity holdings from kite", "user_id", userID)
	startEquity := time.Now()
	equityHoldings, err := client.GetHoldings()
	if err != nil {
		failMsg := fmt.Sprintf("failed to fetch equity holdings: %v", err)
		slog.Error("sync: equity holdings call failed", "user_id", userID, "error", err, "duration", time.Since(startEquity))
		s.recordFailedSnapshot(ctx, userID, failMsg)
		return nil, errors.New(failMsg)
	}
	slog.Info("sync: equity holdings received", "user_id", userID, "count", len(equityHoldings), "duration", time.Since(startEquity))

	// 2. Fetch mutual fund holdings from Kite
	slog.Info("sync: requesting mutual fund holdings from kite", "user_id", userID)
	startMF := time.Now()
	mfHoldings, err := client.GetMFHoldings()
	if err != nil {
		failMsg := fmt.Sprintf("failed to fetch mutual fund holdings: %v", err)
		slog.Error("sync: mutual funds call failed", "user_id", userID, "error", err, "duration", time.Since(startMF))
		s.recordFailedSnapshot(ctx, userID, failMsg)
		return nil, errors.New(failMsg)
	}
	slog.Info("sync: mutual fund holdings received", "user_id", userID, "count", len(mfHoldings), "duration", time.Since(startMF))

	// 3. Both calls succeeded: atomically persist holdings and snapshot in a transaction
	now := time.Now().UTC()
	syncedAtStr := now.Format(time.RFC3339)
	snapshotDateStr := now.Format("2006-01-02")

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck

	qtx := s.queries.WithTx(tx)

	// Clear previous holdings for this user
	if err := qtx.DeleteHoldingsByUserID(ctx, userID); err != nil {
		return nil, fmt.Errorf("failed to clear old equity holdings: %w", err)
	}
	if err := qtx.DeleteMFHoldingsByUserID(ctx, userID); err != nil {
		return nil, fmt.Errorf("failed to clear old mutual fund holdings: %w", err)
	}

	var equityInvestment, equityCurrentValue, equityPnL, dayPnL float64
	var storedEquity []store.Holding

	for _, h := range equityHoldings {
		discrepancy := int64(0)
		if h.Discrepancy {
			discrepancy = 1
		}

		inv := float64(h.Quantity) * h.AveragePrice
		curr := float64(h.Quantity) * h.LastPrice
		equityInvestment += inv
		equityCurrentValue += curr
		equityPnL += h.PnL
		dayPnL += h.DayChange * float64(h.Quantity)

		inserted, err := qtx.InsertHolding(ctx, store.InsertHoldingParams{
			UserID:              userID,
			Tradingsymbol:       h.Tradingsymbol,
			Exchange:            h.Exchange,
			InstrumentToken:     int64(h.InstrumentToken),
			Isin:                h.ISIN,
			Product:             h.Product,
			Price:               h.Price,
			Quantity:            int64(h.Quantity),
			T1Quantity:          int64(h.T1Quantity),
			RealisedQuantity:    int64(h.RealisedQuantity),
			AuthorisedQuantity:  int64(h.AuthorisedQuantity),
			OpeningQuantity:     int64(h.OpeningQuantity),
			CollateralQuantity:  int64(h.CollateralQuantity),
			CollateralType:      h.CollateralType,
			AveragePrice:        h.AveragePrice,
			LastPrice:           h.LastPrice,
			ClosePrice:          h.ClosePrice,
			Pnl:                 h.PnL,
			DayChange:           h.DayChange,
			DayChangePercentage: h.DayChangePercentage,
			Discrepancy:         discrepancy,
			SyncedAt:            now,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to insert equity holding %s: %w", h.Tradingsymbol, err)
		}
		storedEquity = append(storedEquity, inserted)
	}

	var mfInvestment, mfCurrentValue, mfPnL float64
	var storedMF []store.MfHolding

	for _, mf := range mfHoldings {
		inv := mf.Quantity * mf.AveragePrice
		curr := mf.Quantity * mf.LastPrice
		mfInvestment += inv
		mfCurrentValue += curr
		mfPnL += mf.Pnl

		inserted, err := qtx.InsertMFHolding(ctx, store.InsertMFHoldingParams{
			UserID:        userID,
			Folio:         mf.Folio,
			Fund:          mf.Fund,
			Tradingsymbol: mf.Tradingsymbol,
			AveragePrice:  mf.AveragePrice,
			LastPrice:     mf.LastPrice,
			LastPriceDate: mf.LastPriceDate,
			Pnl:           mf.Pnl,
			Quantity:      mf.Quantity,
			SyncedAt:      now,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to insert mutual fund %s: %w", mf.Tradingsymbol, err)
		}
		storedMF = append(storedMF, inserted)
	}

	// Compute combined portfolio summary
	equityInvestment = round2(equityInvestment)
	equityCurrentValue = round2(equityCurrentValue)
	equityPnL = round2(equityPnL)

	mfInvestment = round2(mfInvestment)
	mfCurrentValue = round2(mfCurrentValue)
	mfPnL = round2(mfPnL)

	totalInvestment := round2(equityInvestment + mfInvestment)
	currentValue := round2(equityCurrentValue + mfCurrentValue)
	totalPnL := round2(equityPnL + mfPnL)
	dayPnL = round2(dayPnL)

	var totalPnLPercentage float64
	if totalInvestment > 0 {
		totalPnLPercentage = round2((totalPnL / totalInvestment) * 100)
	}

	// Save single combined snapshot with status 'success'
	_, err = qtx.InsertPortfolioSnapshot(ctx, store.InsertPortfolioSnapshotParams{
		UserID:             userID,
		Status:             "success",
		ErrorMessage:       "",
		EquityInvestment:   equityInvestment,
		EquityCurrentValue: equityCurrentValue,
		EquityPnl:          equityPnL,
		EquityCount:        int64(len(storedEquity)),
		MfInvestment:       mfInvestment,
		MfCurrentValue:     mfCurrentValue,
		MfPnl:              mfPnL,
		MfCount:            int64(len(storedMF)),
		TotalInvestment:    totalInvestment,
		CurrentValue:       currentValue,
		TotalPnl:           totalPnL,
		TotalPnlPercentage: totalPnLPercentage,
		DayPnl:             dayPnL,
		SnapshotDate:       snapshotDateStr,
		CreatedAt:          now,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to record portfolio snapshot: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	slog.Info("sync: successfully persisted to database",
		"user_id", userID,
		"equity_count", len(storedEquity),
		"mf_count", len(storedMF),
		"current_value", currentValue,
	)

	summary := PortfolioSummary{
		TotalInvestment:    totalInvestment,
		CurrentValue:       currentValue,
		TotalPnL:           totalPnL,
		TotalPnLPercentage: totalPnLPercentage,
		DayPnL:             dayPnL,
		EquityInvestment:   equityInvestment,
		EquityCurrentValue: equityCurrentValue,
		EquityPnL:          equityPnL,
		EquityCount:        len(storedEquity),
		MFInvestment:       mfInvestment,
		MFCurrentValue:     mfCurrentValue,
		MFPnL:              mfPnL,
		MFCount:            len(storedMF),
		LastSyncedAt:       syncedAtStr,
	}

	enrichedEquity, enrichedMF := s.enrichHoldings(ctx, userID, storedEquity, storedMF)
	return &PortfolioResponse{
		Summary:        summary,
		EquityHoldings: enrichedEquity,
		MFHoldings:     enrichedMF,
	}, nil
}

// GetPortfolio reads the stored equity and mutual fund holdings for the user from SQLite.
func (s *Service) GetPortfolio(ctx context.Context, userID int64) (*PortfolioResponse, error) {
	holdings, err := s.queries.GetHoldingsByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get equity holdings: %w", err)
	}

	mfHoldings, err := s.queries.GetMFHoldingsByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get mutual fund holdings: %w", err)
	}

	latestSnapshot, err := s.queries.GetLatestSuccessfulPortfolioSnapshot(ctx, userID)
	var summary PortfolioSummary
	if err == nil {
		summary = PortfolioSummary{
			TotalInvestment:    latestSnapshot.TotalInvestment,
			CurrentValue:       latestSnapshot.CurrentValue,
			TotalPnL:           latestSnapshot.TotalPnl,
			TotalPnLPercentage: latestSnapshot.TotalPnlPercentage,
			DayPnL:             latestSnapshot.DayPnl,
			EquityInvestment:   latestSnapshot.EquityInvestment,
			EquityCurrentValue: latestSnapshot.EquityCurrentValue,
			EquityPnL:          latestSnapshot.EquityPnl,
			EquityCount:        int(latestSnapshot.EquityCount),
			MFInvestment:       latestSnapshot.MfInvestment,
			MFCurrentValue:     latestSnapshot.MfCurrentValue,
			MFPnL:              latestSnapshot.MfPnl,
			MFCount:            int(latestSnapshot.MfCount),
			LastSyncedAt:       latestSnapshot.CreatedAt.Format(time.RFC3339),
		}
	} else {
		// Calculate from stored holdings if no snapshot is present
		var eqInv, eqCurr, eqPnL, dayPnL float64
		for _, h := range holdings {
			eqInv += float64(h.Quantity) * h.AveragePrice
			eqCurr += float64(h.Quantity) * h.LastPrice
			eqPnL += h.Pnl
			dayPnL += h.DayChange * float64(h.Quantity)
		}

		var mfInv, mfCurr, mfPnL float64
		for _, mf := range mfHoldings {
			mfInv += mf.Quantity * mf.AveragePrice
			mfCurr += mf.Quantity * mf.LastPrice
			mfPnL += mf.Pnl
		}

		totInv := round2(eqInv + mfInv)
		totCurr := round2(eqCurr + mfCurr)
		totPnL := round2(eqPnL + mfPnL)

		var pnlPct float64
		if totInv > 0 {
			pnlPct = round2((totPnL / totInv) * 100)
		}

		summary = PortfolioSummary{
			TotalInvestment:    totInv,
			CurrentValue:       totCurr,
			TotalPnL:           totPnL,
			TotalPnLPercentage: pnlPct,
			DayPnL:             round2(dayPnL),
			EquityInvestment:   round2(eqInv),
			EquityCurrentValue: round2(eqCurr),
			EquityPnL:          round2(eqPnL),
			EquityCount:        len(holdings),
			MFInvestment:       round2(mfInv),
			MFCurrentValue:     round2(mfCurr),
			MFPnL:              round2(mfPnL),
			MFCount:            len(mfHoldings),
		}
	}

	enrichedEquity, enrichedMF := s.enrichHoldings(ctx, userID, holdings, mfHoldings)
	return &PortfolioResponse{
		Summary:        summary,
		EquityHoldings: enrichedEquity,
		MFHoldings:     enrichedMF,
	}, nil
}

func (s *Service) enrichHoldings(ctx context.Context, userID int64, equity []store.Holding, mf []store.MfHolding) ([]HoldingItem, []MFHoldingItem) {
	goalAssets, _ := s.queries.ListGoalAssetsByUserID(ctx, userID)
	assetAllocationsMap := make(map[string][]AssetAllocation, len(goalAssets))
	for _, ga := range goalAssets {
		key := ga.AssetType + ":" + ga.AssetKey
		assetAllocationsMap[key] = append(assetAllocationsMap[key], AssetAllocation{
			GoalID:               ga.GoalID,
			AllocationPercentage: ga.AllocationPercentage,
		})
	}

	enrichedEquity := make([]HoldingItem, len(equity))
	for i, h := range equity {
		key := fmt.Sprintf("%s:%s", h.Tradingsymbol, h.Exchange)
		allocs := assetAllocationsMap["equity:"+key]
		if allocs == nil {
			allocs = []AssetAllocation{}
		}
		var totalPercent int64
		for _, a := range allocs {
			totalPercent += a.AllocationPercentage
		}
		item := HoldingItem{
			Holding:               h,
			AssetKey:              key,
			Allocations:           allocs,
			TotalAllocatedPercent: totalPercent,
		}
		if len(allocs) == 1 && allocs[0].AllocationPercentage == 100 {
			item.GoalID = &allocs[0].GoalID
		}
		enrichedEquity[i] = item
	}

	enrichedMF := make([]MFHoldingItem, len(mf))
	for i, m := range mf {
		key := fmt.Sprintf("%s:%s", m.Folio, m.Fund)
		allocs := assetAllocationsMap["mf:"+key]
		if allocs == nil {
			allocs = []AssetAllocation{}
		}
		var totalPercent int64
		for _, a := range allocs {
			totalPercent += a.AllocationPercentage
		}
		item := MFHoldingItem{
			MfHolding:             m,
			AssetKey:              key,
			Allocations:           allocs,
			TotalAllocatedPercent: totalPercent,
		}
		if len(allocs) == 1 && allocs[0].AllocationPercentage == 100 {
			item.GoalID = &allocs[0].GoalID
		}
		enrichedMF[i] = item
	}

	return enrichedEquity, enrichedMF
}

// GetHistory returns historical portfolio snapshots for the user.
func (s *Service) GetHistory(ctx context.Context, userID int64, limit int64) ([]store.PortfolioSnapshot, error) {
	if limit <= 0 {
		limit = 90
	}
	return s.queries.ListPortfolioSnapshotsByUserID(ctx, store.ListPortfolioSnapshotsByUserIDParams{
		UserID: userID,
		Limit:  limit,
	})
}

func (s *Service) recordFailedSnapshot(ctx context.Context, userID int64, errMsg string) {
	now := time.Now().UTC()
	_, _ = s.queries.InsertPortfolioSnapshot(ctx, store.InsertPortfolioSnapshotParams{
		UserID:             userID,
		Status:             "failed",
		ErrorMessage:       errMsg,
		EquityInvestment:   0,
		EquityCurrentValue: 0,
		EquityPnl:          0,
		EquityCount:        0,
		MfInvestment:       0,
		MfCurrentValue:     0,
		MfPnl:              0,
		MfCount:            0,
		TotalInvestment:    0,
		CurrentValue:       0,
		TotalPnl:           0,
		TotalPnlPercentage: 0,
		DayPnl:             0,
		SnapshotDate:       now.Format("2006-01-02"),
		CreatedAt:          now,
	})
}

func round2(val float64) float64 {
	return math.Round(val*100) / 100
}
