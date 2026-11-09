import { AuthProvider } from '@/context/AuthContext'
import { useAuth } from '@/hooks/useAuth'
import { Logo } from '@/components/Logo'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'

function AppContent() {
  const { auth } = useAuth()

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Logo size={40} className="animate-pulse" />
          <p className="text-sm text-muted-foreground font-medium">Loading Finolio...</p>
        </div>
      </div>
    )
  }

  if (auth.authenticated && auth.user) {
    return <DashboardPage />
  }

  return <LoginPage />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
