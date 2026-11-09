package portfolio

import (
	"github.com/ganapathypt/finolio/internal/store"
)

// PortfolioSummary represents aggregated metrics calculated across equity and mutual fund holdings.
type PortfolioSummary struct {
	TotalInvestment    float64 `json:"total_investment"`
	CurrentValue       float64 `json:"current_value"`
	TotalPnL           float64 `json:"total_pnl"`
	TotalPnLPercentage float64 `json:"total_pnl_percentage"`
	DayPnL             float64 `json:"day_pnl"`
	EquityInvestment   float64 `json:"equity_investment"`
	EquityCurrentValue float64 `json:"equity_current_value"`
	EquityPnL          float64 `json:"equity_pnl"`
	EquityCount        int     `json:"equity_count"`
	MFInvestment       float64 `json:"mf_investment"`
	MFCurrentValue     float64 `json:"mf_current_value"`
	MFPnL              float64 `json:"mf_pnl"`
	MFCount            int     `json:"mf_count"`
	LastSyncedAt       string  `json:"last_synced_at,omitempty"`
}

// HoldingItem decorates store.Holding with asset key and optional goal_id.
type HoldingItem struct {
	store.Holding
	AssetKey string `json:"asset_key"`
	GoalID   *int64 `json:"goal_id"`
}

// MFHoldingItem decorates store.MfHolding with asset key and optional goal_id.
type MFHoldingItem struct {
	store.MfHolding
	AssetKey string `json:"asset_key"`
	GoalID   *int64 `json:"goal_id"`
}

// PortfolioResponse holds equity holdings, mutual funds, and combined summary returned to the frontend.
type PortfolioResponse struct {
	Summary        PortfolioSummary `json:"summary"`
	EquityHoldings []HoldingItem    `json:"equity_holdings"`
	MFHoldings     []MFHoldingItem  `json:"mf_holdings"`
}
