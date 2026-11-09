import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPortfolio, syncPortfolio } from '@/api/portfolio'
import type { PortfolioResponse } from '@/types/portfolio'

export const portfolioQueryKey = ['portfolio'] as const

export function usePortfolio() {
  const queryClient = useQueryClient()

  // Reads the stored portfolio from local SQLite. Never polls in the background.
  const portfolioQuery = useQuery<PortfolioResponse>({
    queryKey: portfolioQueryKey,
    queryFn: fetchPortfolio,
    staleTime: Infinity, // Do not auto-refetch
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  })

  // sync is strictly triggered by user interaction (button click). No background calls.
  const syncMutation = useMutation({
    mutationFn: syncPortfolio,
    retry: false, // User demand: no retry if call fails
    onSuccess: (data) => {
      queryClient.setQueryData(portfolioQueryKey, data)
    },
  })

  return {
    portfolio: portfolioQuery.data,
    isLoading: portfolioQuery.isLoading,
    isRefetching: portfolioQuery.isRefetching,
    error: portfolioQuery.error,
    refetch: portfolioQuery.refetch,
    sync: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
    syncError: syncMutation.error,
  }
}
