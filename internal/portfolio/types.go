package portfolio

import (
	"github.com/ganapathypt/finolio/internal/store"
)

// PortfolioSummary represents aggregated metrics calculated across the user's holdings.
type PortfolioSummary struct {
	TotalInvestment    float64 `json:"total_investment"`
	CurrentValue       float64 `json:"current_value"`
	TotalPnL           float64 `json:"total_pnl"`
	TotalPnLPercentage float64 `json:"total_pnl_percentage"`
	DayPnL             float64 `json:"day_pnl"`
	HoldingsCount      int     `json:"holdings_count"`
	LastSyncedAt       string  `json:"last_synced_at,omitempty"`
}

// PortfolioResponse holds the holdings data and summary returned to the frontend.
type PortfolioResponse struct {
	Summary  PortfolioSummary `json:"summary"`
	Holdings []store.Holding  `json:"holdings"`
}
