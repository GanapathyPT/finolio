export interface PortfolioSummary {
  total_investment: number
  current_value: number
  total_pnl: number
  total_pnl_percentage: number
  day_pnl: number
  equity_investment: number
  equity_current_value: number
  equity_pnl: number
  equity_count: number
  mf_investment: number
  mf_current_value: number
  mf_pnl: number
  mf_count: number
  last_synced_at?: string
}

export interface AssetAllocation {
  goal_id: number
  allocation_percentage: number
}

export interface Holding {
  id: number
  user_id: number
  tradingsymbol: string
  exchange: string
  instrument_token: number
  isin: string
  product: string
  price: number
  quantity: number
  t1_quantity: number
  realised_quantity: number
  authorised_quantity: number
  opening_quantity: number
  collateral_quantity: number
  collateral_type: string
  average_price: number
  last_price: number
  close_price: number
  pnl: number
  day_change: number
  day_change_percentage: number
  discrepancy: number
  synced_at: string
  asset_key?: string
  goal_id?: number | null
  allocations?: AssetAllocation[]
  total_allocated_percent?: number
}

export interface MfHolding {
  id: number
  user_id: number
  folio: string
  fund: string
  tradingsymbol: string
  average_price: number
  last_price: number
  last_price_date: string
  pnl: number
  quantity: number
  synced_at: string
  asset_key?: string
  goal_id?: number | null
  allocations?: AssetAllocation[]
  total_allocated_percent?: number
}

export interface PortfolioSnapshot {
  id: number
  user_id: number
  status: 'success' | 'failed'
  error_message: string
  equity_investment: number
  equity_current_value: number
  equity_pnl: number
  equity_count: number
  mf_investment: number
  mf_current_value: number
  mf_pnl: number
  mf_count: number
  total_investment: number
  current_value: number
  total_pnl: number
  total_pnl_percentage: number
  day_pnl: number
  snapshot_date: string
  created_at: string
}

export interface PortfolioResponse {
  summary: PortfolioSummary
  equity_holdings: Holding[]
  mf_holdings: MfHolding[]
}
