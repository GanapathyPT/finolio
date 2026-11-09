import type { User } from '@/types/auth'

export interface AuthMeResponse {
  authenticated: boolean
  user?: User
  has_kite_session?: boolean
}

export async function getMe(): Promise<AuthMeResponse> {
  const res = await fetch('/api/auth/me', { credentials: 'include' })
  if (!res.ok) {
    if (res.status === 401) {
      return { authenticated: false }
    }
    throw new Error(`Failed to fetch current user session: ${res.status}`)
  }
  return res.json()
}

export async function logout(): Promise<void> {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) {
    throw new Error(`Logout request failed: ${res.status}`)
  }
}

