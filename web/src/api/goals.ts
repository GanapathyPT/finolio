import type { GoalNode, CreateGoalRequest, UpdateGoalRequest, AssignAssetRequest } from '@/types/goals'

export async function fetchGoalsTree(): Promise<GoalNode[]> {
  const res = await fetch('/api/goals', { credentials: 'same-origin' })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(errorText || 'Failed to fetch goals')
  }
  const data = await res.json()
  return data.goals || []
}

export async function createGoal(req: CreateGoalRequest): Promise<GoalNode> {
  const res = await fetch('/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to create goal' }))
    throw new Error(error.error || 'Failed to create goal')
  }
  return res.json()
}

export async function updateGoal(id: number, req: UpdateGoalRequest): Promise<GoalNode> {
  const res = await fetch(`/api/goals/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to update goal' }))
    throw new Error(error.error || 'Failed to update goal')
  }
  return res.json()
}

export async function deleteGoal(id: number): Promise<void> {
  const res = await fetch(`/api/goals/${id}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to delete goal' }))
    throw new Error(error.error || 'Failed to delete goal')
  }
}

export async function assignAssetToGoal(req: AssignAssetRequest): Promise<void> {
  const res = await fetch('/api/goals/assign-asset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to assign asset' }))
    throw new Error(error.error || 'Failed to assign asset')
  }
}

