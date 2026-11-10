export interface GoalNode {
  id: number
  user_id: number
  parent_id: number | null
  title: string
  description: string
  target_amount: number | null
  target_date: string | null
  display_order: number
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
  display_order?: number
}

export interface UpdateGoalRequest {
  parent_id?: number | null
  title: string
  description?: string
  target_amount?: number | null
  target_date?: string | null
  display_order?: number
}

export interface ReorderGoalItem {
  id: number
  display_order: number
}

export interface ReorderGoalsRequest {
  orders: ReorderGoalItem[]
}

export interface SubGoalAllocation {
  goalId: number
  allocatedCorpus: number
  allocatedInvested: number
  targetAmount: number
  percentFunded: number
  status: 'funded' | 'partial' | 'queued'
}

/**
 * Recursively calculates branch-first waterfall funding down a goal hierarchy.
 * Root goals hold the direct assets. Their accumulated corpus is distributed to
 * immediate children in priority order (by display_order ASC).
 * Each child branch recursively funds its own sub-goals with its allocated amount.
 */
export function calculateBranchWaterfall(
  rootGoal: GoalNode,
  rootCoveredCorpus: number,
  rootInvestedCapital: number
): Map<number, SubGoalAllocation> {
  const result = new Map<number, SubGoalAllocation>()

  const costBasisRatio = rootCoveredCorpus > 0 ? rootInvestedCapital / rootCoveredCorpus : 1

  function getEffectiveTarget(node: GoalNode): number {
    if (node.target_amount && node.target_amount > 0) {
      return node.target_amount
    }
    if (node.children && node.children.length > 0) {
      return node.children.reduce((sum, child) => sum + getEffectiveTarget(child), 0)
    }
    return 0
  }

  function distributeToChildren(children: GoalNode[], availableFunds: number) {
    const sorted = [...children].sort((a, b) => {
      const orderA = a.display_order ?? 0
      const orderB = b.display_order ?? 0
      if (orderA !== orderB) return orderA - orderB
      return a.id - b.id
    })

    let remaining = availableFunds

    for (const child of sorted) {
      const target = getEffectiveTarget(child)
      let allocated = 0

      if (target > 0) {
        allocated = Math.min(remaining, target)
        remaining -= allocated
      } else {
        // If no explicit target, allocate whatever is remaining
        allocated = remaining
        remaining = 0
      }

      const percent = target > 0 ? (allocated / target) * 100 : allocated > 0 ? 100 : 0
      let status: 'funded' | 'partial' | 'queued' = 'queued'
      if (percent >= 99.99) {
        status = 'funded'
      } else if (allocated > 0) {
        status = 'partial'
      }

      const invested = allocated * costBasisRatio

      result.set(child.id, {
        goalId: child.id,
        allocatedCorpus: allocated,
        allocatedInvested: invested,
        targetAmount: target,
        percentFunded: Math.min(100, percent),
        status,
      })

      if (child.children && child.children.length > 0) {
        distributeToChildren(child.children, allocated)
      }
    }
  }

  if (rootGoal.children && rootGoal.children.length > 0) {
    distributeToChildren(rootGoal.children, rootCoveredCorpus)
  }

  return result
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

export interface ProjectedCorpusResult {
  nominalAmount: number
  projectedAmount: number
  inflationImpact: number
  yearsRemaining: number
  hasInflation: boolean
  inflationRate: number
}

export function calculateProjectedCorpus(
  targetAmount?: number | null,
  targetDate?: string | null,
  annualInflationRate = 0.07
): ProjectedCorpusResult {
  const nominal = targetAmount && targetAmount > 0 ? targetAmount : 0
  if (!nominal || !targetDate) {
    return {
      nominalAmount: nominal,
      projectedAmount: nominal,
      inflationImpact: 0,
      yearsRemaining: 0,
      hasInflation: false,
      inflationRate: annualInflationRate,
    }
  }

  const trimmed = targetDate.trim()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  let years = 0

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number)
    const targetTime = new Date(y, m - 1, d).getTime()
    const diffDays = (targetTime - now.getTime()) / (1000 * 60 * 60 * 24)
    years = Math.max(0, diffDays / 365.25)
  } else if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const [y, m] = trimmed.split('-').map(Number)
    const monthDiff = (y - currentYear) * 12 + (m - 1 - currentMonth)
    years = Math.max(0, monthDiff / 12)
  } else if (/^\d{4}$/.test(trimmed)) {
    const y = parseInt(trimmed, 10)
    years = Math.max(0, y - currentYear)
  }

  if (years <= 0) {
    return {
      nominalAmount: nominal,
      projectedAmount: nominal,
      inflationImpact: 0,
      yearsRemaining: 0,
      hasInflation: false,
      inflationRate: annualInflationRate,
    }
  }

  // Future value: PV * (1 + r)^years
  const multiplier = Math.pow(1 + annualInflationRate, years)
  const projectedAmount = Math.round(nominal * multiplier)
  const inflationImpact = projectedAmount - nominal

  return {
    nominalAmount: nominal,
    projectedAmount,
    inflationImpact,
    yearsRemaining: Math.round(years * 10) / 10,
    hasInflation: inflationImpact > 0,
    inflationRate: annualInflationRate,
  }
}


