export interface PortfolioSummary {
  total_investment: number
  current_value: number
  total_pnl: number
  total_pnl_percentage: number
  day_pnl: number
  holdings_count: number
  last_synced_at?: string
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
}

export interface PortfolioSnapshot {
  id: number
  user_id: number
  total_investment: number
  current_value: number
  total_pnl: number
  total_pnl_percentage: number
  day_pnl: number
  holdings_count: number
  snapshot_date: string
  created_at: string
}

export interface PortfolioResponse {
  summary: PortfolioSummary
  holdings: Holding[]
}
