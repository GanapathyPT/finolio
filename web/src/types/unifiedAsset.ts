export interface UnifiedAsset {
  id: number
  asset_type: 'equity' | 'mf'
  asset_key: string
  title: string
  subtitle: string
  quantity: number
  average_price: number
  last_price: number
  current_value: number
  pnl: number
  pnl_percentage: number
  goal_id: number | null
}

