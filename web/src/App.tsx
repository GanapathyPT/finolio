import { useEffect, useState } from 'react'
import '@/App.css'

interface User {
  id: number
  kite_id: string
  user_name: string
  email: string
}

interface AuthState {
  loading: boolean
  authenticated: boolean
  user: User | null
  hasKiteSession: boolean
}

export default function App() {
  const [auth, setAuth] = useState<AuthState>({
    loading: true,
    authenticated: false,
    user: null,
    hasKiteSession: false,
  })

  // Determine dynamic origin to pass to /api/auth/login
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const loginUrl = currentOrigin
    ? `/api/auth/login?redirect_to=${encodeURIComponent(currentOrigin)}`
    : '/api/auth/login'

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) {
          return { authenticated: false }
        }
        return res.json()
      })
      .then((data) => {
        if (data.authenticated && data.user) {
          setAuth({
            loading: false,
            authenticated: true,
            user: data.user,
            hasKiteSession: Boolean(data.has_kite_session),
          })
        } else {
          setAuth({
            loading: false,
            authenticated: false,
            user: null,
            hasKiteSession: false,
          })
        }
      })
      .catch(() => {
        setAuth({
          loading: false,
          authenticated: false,
          user: null,
          hasKiteSession: false,
        })
      })
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (err) {
      console.error('Failed to logout:', err)
    } finally {
      setAuth({
        loading: false,
        authenticated: false,
        user: null,
        hasKiteSession: false,
      })
    }
  }

  if (auth.loading) {
    return (
      <div className="loading-screen">
        <p>Loading Finolio...</p>
      </div>
    )
  }

  // ── Authenticated: Home Page ──
  if (auth.authenticated && auth.user) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="brand-title">Finolio</div>
          <div className="header-user-info">
            <span className="user-badge">{auth.user.user_name} ({auth.user.kite_id})</span>
            <button className="btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="main-content">
          <section className="welcome-section">
            <h1>Welcome back, {auth.user.user_name}!</h1>
            <p className="welcome-subtitle">
              Your Kite Connect account is connected and ready.
            </p>
          </section>

          <div className="dashboard-grid">
            <div className="card">
              <h2>Account Details</h2>
              <div className="info-list">
                <div className="info-row">
                  <span className="info-label">Name</span>
                  <span className="info-value">{auth.user.user_name}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Kite ID</span>
                  <span className="info-value">{auth.user.kite_id}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Email</span>
                  <span className="info-value">{auth.user.email}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h2>Session Status</h2>
              <div className="info-list">
                <div className="info-row">
                  <span className="info-label">Broker</span>
                  <span className="info-value">Zerodha Kite</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Kite Session</span>
                  <span className="info-value">
                    {auth.hasKiteSession ? (
                      <span className="status-tag active">
                        <span className="status-dot"></span> Active
                      </span>
                    ) : (
                      <span className="status-tag">Inactive</span>
                    )}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Validity</span>
                  <span className="info-value">Daily Token</span>
                </div>
              </div>
            </div>
          </div>

          <div className="portfolio-placeholder">
            <h3>Portfolio & Analytics</h3>
            <p>
              Your portfolio dashboard, holdings, positions, and analytics will be displayed here.
            </p>
          </div>
        </main>
      </div>
    )
  }

  // ── Unauthenticated: Login Screen ──
  return (
    <div className="login-hero">
      <div className="login-card">
        <h1>Finolio</h1>
        <p className="login-desc">
          Sign in with your Zerodha Kite account to manage your portfolio and view analytics.
        </p>
        <a className="btn-kite-login" href={loginUrl}>
          Login with Zerodha Kite
        </a>
      </div>
    </div>
  )
}
