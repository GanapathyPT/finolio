export interface User {
  id: number
  kite_id: string
  user_name: string
  email: string
}

export interface AuthState {
  loading: boolean
  authenticated: boolean
  user: User | null
  hasKiteSession: boolean
}

export interface AuthContextValue {
  auth: AuthState
  loginUrl: string
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
  isRefetching?: boolean
}
