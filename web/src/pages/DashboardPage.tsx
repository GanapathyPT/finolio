import {
  User,
  KeyRound,
  Mail,
  ShieldCheck,
  XCircle,
  BarChart3,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/Header'
import { useAuth } from '@/hooks/useAuth'

export function DashboardPage() {
  const { auth } = useAuth()
  const user = auth.user

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Welcome Section */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {user.user_name}
          </h1>
          <p className="text-muted-foreground text-sm">
            Your Kite Connect integration is active. View your account overview and session telemetry below.
          </p>
        </div>

        {/* Dashboard Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Account Details Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Account Details</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardDescription>Zerodha broker profile information</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-3.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" /> Name
                </span>
                <span className="font-medium">{user.user_name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <KeyRound className="h-4 w-4" /> Kite User ID
                </span>
                <Badge variant="outline" className="font-mono">{user.kite_id}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" /> Email Address
                </span>
                <span className="font-medium">{user.email}</span>
              </div>
            </CardContent>
          </Card>

          {/* Session Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Session Status</CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardDescription>Authentication and Kite token telemetry</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-3.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Broker Connection</span>
                <span className="font-medium">Zerodha Kite</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Kite Session</span>
                {auth.hasKiteSession ? (
                  <Badge variant="default" className="gap-1.5 bg-emerald-600 hover:bg-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    Active Session
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1.5 text-amber-500 border-amber-500/30">
                    <XCircle className="h-3 w-3" />
                    Inactive
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Token Lifetime</span>
                <span className="font-medium text-xs font-mono">Daily (Expires 06:00 IST)</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Placeholder Card */}
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="font-semibold text-lg">Portfolio & Analytics Coming Next</h3>
              <p className="text-sm text-muted-foreground">
                Holdings, orders, positions, and visual P&L analytics will be displayed here directly from your Zerodha Kite account.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

