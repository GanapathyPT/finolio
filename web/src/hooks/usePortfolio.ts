import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchPortfolio, syncPortfolio } from '@/api/portfolio'
import type { PortfolioResponse } from '@/types/portfolio'

export const portfolioQueryKey = ['portfolio'] as const

export function usePortfolio() {
  const queryClient = useQueryClient()

  const portfolioQuery = useQuery<PortfolioResponse>({
    queryKey: portfolioQueryKey,
    queryFn: fetchPortfolio,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  })

  const syncMutation = useMutation({
    mutationFn: syncPortfolio,
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

