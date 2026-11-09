import {
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMe, logout as logoutApi } from '@/api/auth'
import { AuthContext } from '@/context/auth-context'
import { queryKeys } from '@/lib/query-keys'
import type { AuthContextValue, AuthState } from '@/types/auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  // Dynamic login URL for Zerodha Kite OAuth redirect
  const loginUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return origin
      ? `/api/auth/login?redirect_to=${encodeURIComponent(origin)}`
      : '/api/auth/login'
  }, [])

  // Query: Current authentication session
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: getMe,
    staleTime: 1000 * 60 * 5, // 5 minutes stale time for user profile/auth session
  })

  // Mutation: Logout session
  const logoutMutation = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      // Optimistically update query data to unauthenticated state immediately
      queryClient.setQueryData(queryKeys.auth.me, { authenticated: false })
      // Clear any other cached queries (e.g. portfolio data)
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'auth',
      })
    },
  })

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync()
  }, [logoutMutation])

  const refreshAuth = useCallback(async () => {
    await refetch()
  }, [refetch])

  const auth = useMemo<AuthState>(
    () => ({
      loading: isLoading,
      authenticated: Boolean(data?.authenticated && data?.user),
      user: data?.user ?? null,
      hasKiteSession: Boolean(data?.has_kite_session),
    }),
    [data, isLoading]
  )

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      auth,
      loginUrl,
      logout,
      refreshAuth,
      isRefetching,
    }),
    [auth, loginUrl, logout, refreshAuth, isRefetching]
  )

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}
