export interface AssetAllocation {
  goal_id: number
  allocation_percentage: number
}

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
  allocations: AssetAllocation[]
  total_allocated_percentage: number
  unallocated_percentage: number
}

