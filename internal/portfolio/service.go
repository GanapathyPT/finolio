package portfolio

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/ganapathypt/finolio/internal/store"
)

// Service coordinates fetching, storing, and computing holdings metrics.
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

// Sync connects to Zerodha Kite with the user's active session, retrieves holdings,
// and atomically updates the local database.
func (s *Service) Sync(ctx context.Context, userID int64) (*PortfolioResponse, error) {
	session, err := s.queries.GetKiteSessionByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("kite session not found: %w", err)
	}
	if session.AccessToken == "" {
		return nil, errors.New("kite access token is empty, please sign in")
	}

	client := s.clientFactory(s.apiKey, session.AccessToken)

	// Fetch holdings from Zerodha Kite
	holdings, err := client.GetHoldings()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch holdings from kite: %w", err)
	}

	now := time.Now().UTC()
	syncedAtStr := now.Format(time.RFC3339)
	snapshotDateStr := now.Format("2006-01-02")

	// Begin atomic database transaction
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback() //nolint:errcheck

	qtx := s.queries.WithTx(tx)

	// 1. Delete old holdings for this user
	if err := qtx.DeleteHoldingsByUserID(ctx, userID); err != nil {
		return nil, fmt.Errorf("failed to clear old holdings: %w", err)
	}

	var totalInvestment float64
	var currentValue float64
	var totalPnL float64
	var dayPnL float64
	var storedHoldings []store.Holding

	for _, h := range holdings {
		discrepancy := int64(0)
		if h.Discrepancy {
			discrepancy = 1
		}

		inv := float64(h.Quantity) * h.AveragePrice
		curr := float64(h.Quantity) * h.LastPrice
		totalInvestment += inv
		currentValue += curr
		totalPnL += h.PnL
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
			return nil, fmt.Errorf("failed to insert holding %s: %w", h.Tradingsymbol, err)
		}
		storedHoldings = append(storedHoldings, inserted)
	}

	// 2. Compute aggregated summary metrics
	totalInvestment = round2(totalInvestment)
	currentValue = round2(currentValue)
	totalPnL = round2(totalPnL)
	dayPnL = round2(dayPnL)

	var totalPnLPercentage float64
	if totalInvestment > 0 {
		totalPnLPercentage = round2((totalPnL / totalInvestment) * 100)
	}

	// 3. Record historical portfolio snapshot
	_, err = qtx.InsertPortfolioSnapshot(ctx, store.InsertPortfolioSnapshotParams{
		UserID:             userID,
		TotalInvestment:    totalInvestment,
		CurrentValue:       currentValue,
		TotalPnl:           totalPnL,
		TotalPnlPercentage: totalPnLPercentage,
		DayPnl:             dayPnL,
		HoldingsCount:      int64(len(storedHoldings)),
		SnapshotDate:       snapshotDateStr,
		CreatedAt:          now,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to record portfolio snapshot: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit portfolio transaction: %w", err)
	}

	summary := PortfolioSummary{
		TotalInvestment:    totalInvestment,
		CurrentValue:       currentValue,
		TotalPnL:           totalPnL,
		TotalPnLPercentage: totalPnLPercentage,
		DayPnL:             dayPnL,
		HoldingsCount:      len(storedHoldings),
		LastSyncedAt:       syncedAtStr,
	}

	return &PortfolioResponse{
		Summary:  summary,
		Holdings: storedHoldings,
	}, nil
}

// GetPortfolio reads the stored holdings for the user from the database.
func (s *Service) GetPortfolio(ctx context.Context, userID int64) (*PortfolioResponse, error) {
	holdings, err := s.queries.GetHoldingsByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get holdings: %w", err)
	}

	latestSnapshot, err := s.queries.GetLatestPortfolioSnapshot(ctx, userID)
	var summary PortfolioSummary
	if err == nil {
		summary = PortfolioSummary{
			TotalInvestment:    latestSnapshot.TotalInvestment,
			CurrentValue:       latestSnapshot.CurrentValue,
			TotalPnL:           latestSnapshot.TotalPnl,
			TotalPnLPercentage: latestSnapshot.TotalPnlPercentage,
			DayPnL:             latestSnapshot.DayPnl,
			HoldingsCount:      int(latestSnapshot.HoldingsCount),
			LastSyncedAt:       latestSnapshot.CreatedAt.Format(time.RFC3339),
		}
	} else {
		// Calculate from holdings directly if snapshot is not available yet
		var totalInvestment, currentValue, totalPnL, dayPnL float64
		for _, h := range holdings {
			totalInvestment += float64(h.Quantity) * h.AveragePrice
			currentValue += float64(h.Quantity) * h.LastPrice
			totalPnL += h.Pnl
			dayPnL += h.DayChange * float64(h.Quantity)
		}
		var pnlPct float64
		if totalInvestment > 0 {
			pnlPct = round2((totalPnL / totalInvestment) * 100)
		}
		summary = PortfolioSummary{
			TotalInvestment:    round2(totalInvestment),
			CurrentValue:       round2(currentValue),
			TotalPnL:           round2(totalPnL),
			TotalPnLPercentage: pnlPct,
			DayPnL:             round2(dayPnL),
			HoldingsCount:      len(holdings),
		}
	}

	return &PortfolioResponse{
		Summary:  summary,
		Holdings: holdings,
	}, nil
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

func round2(val float64) float64 {
	return math.Round(val*100) / 100
}
