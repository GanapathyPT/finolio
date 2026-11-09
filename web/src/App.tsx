import { TrendingUp } from 'lucide-react'
import { AuthProvider } from '@/context/AuthContext'
import { useAuth } from '@/hooks/useAuth'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'

function AppContent() {
  const { auth } = useAuth()

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <TrendingUp className="h-8 w-8 animate-pulse text-primary" />
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
