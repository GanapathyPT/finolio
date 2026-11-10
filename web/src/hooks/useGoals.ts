import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchGoalsTree,
  createGoal,
  updateGoal,
  deleteGoal,
  assignAssetToGoal,
  reorderGoals,
} from '@/api/goals'
import type {
  CreateGoalRequest,
  UpdateGoalRequest,
  AssignAssetRequest,
  ReorderGoalsRequest,
  GoalNode,
} from '@/types/goals'

export function useGoals() {
  const queryClient = useQueryClient()

  const {
    data: goals = [],
    isLoading,
    error,
    refetch,
  } = useQuery<GoalNode[]>({
    queryKey: ['goals'],
    queryFn: fetchGoalsTree,
    staleTime: 1000 * 60 * 5,
  })

  const createMutation = useMutation({
    mutationFn: (req: CreateGoalRequest) => createGoal(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, req }: { id: number; req: UpdateGoalRequest }) => updateGoal(id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })

  const assignAssetMutation = useMutation({
    mutationFn: (req: AssignAssetRequest) => assignAssetToGoal(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (req: ReorderGoalsRequest) => reorderGoals(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })

  return {
    goals,
    isLoading,
    error,
    refetch,
    createGoal: createMutation.mutateAsync,
    updateGoal: updateMutation.mutateAsync,
    deleteGoal: deleteMutation.mutateAsync,
    assignAsset: assignAssetMutation.mutateAsync,
    isAssigning: assignAssetMutation.isPending,
    reorderGoals: reorderMutation.mutateAsync,
  }
}

