export interface GoalNode {
  id: number
  user_id: number
  parent_id: number | null
  title: string
  description: string
  target_amount: number | null
  target_date: string | null
  created_at: string
  updated_at: string
  children?: GoalNode[]
}

export interface CreateGoalRequest {
  parent_id?: number | null
  title: string
  description?: string
  target_amount?: number | null
  target_date?: string | null
}

export interface UpdateGoalRequest {
  parent_id?: number | null
  title: string
  description?: string
  target_amount?: number | null
  target_date?: string | null
}

export interface AssignAssetRequest {
  asset_type: 'equity' | 'mf'
  asset_key: string
  goal_id: number | null
}

