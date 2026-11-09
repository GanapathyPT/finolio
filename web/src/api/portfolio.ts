import type { PortfolioResponse, PortfolioSnapshot } from '@/types/portfolio'

export async function fetchPortfolio(): Promise<PortfolioResponse> {
  const res = await fetch('/api/portfolio', {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error('Failed to fetch portfolio')
  }
  return res.json()
}

export async function syncPortfolio(): Promise<PortfolioResponse> {
  const res = await fetch('/api/portfolio/sync', {
    method: 'POST',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to sync portfolio from Zerodha')
  }
  return res.json()
}

export async function fetchPortfolioHistory(limit = 90): Promise<{ history: PortfolioSnapshot[] }> {
  const res = await fetch(`/api/portfolio/history?limit=${limit}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error('Failed to fetch portfolio history')
  }
  return res.json()
}
