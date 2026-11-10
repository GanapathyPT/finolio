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
  allocation_percentage?: number
}

export function formatTargetDate(val?: string | null): string {
  if (!val) return ''
  const trimmed = val.trim()

  // Match YYYY-MM-DD (e.g. 2028-12-15 -> 15 Dec 2028)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    }
  }

  // Match YYYY-MM (e.g. 2032-06 -> Jun 2032)
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const [y, m] = trimmed.split('-').map(Number)
    const date = new Date(y, m - 1, 1)
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
      })
    }
  }

  // Match YYYY (e.g. 2040)
  if (/^\d{4}$/.test(trimmed)) {
    return trimmed
  }

  return trimmed
}

