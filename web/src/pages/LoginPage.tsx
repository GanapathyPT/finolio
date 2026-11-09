import { TrendingUp, CheckCircle2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

export function LoginPage() {
  const { loginUrl } = useAuth()

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4">
      <Card className="w-full max-w-md shadow-2xl border bg-card">
        <CardHeader className="text-center space-y-2 p-6 pb-4">
          <div className="mx-auto p-3.5 w-fit rounded-2xl bg-primary/10 text-primary border border-primary/20">
            <TrendingUp className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Finolio</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Personal financial tracking and automated portfolio analytics.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-6 pt-2">
          <div className="rounded-xl border bg-muted/40 p-4 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Direct Zerodha OAuth2 Sign-In</span>
            </div>
            <p className="leading-relaxed">
              Log in securely through Zerodha Kite. Your credentials and TOTP remain strictly with Zerodha; no passwords or API secrets are stored locally.
            </p>
          </div>

          <Button asChild size="lg" className="w-full bg-[#f6461a] hover:bg-[#e03b12] text-white font-semibold shadow-lg shadow-[#f6461a]/20 h-11">
            <a href={loginUrl} className="flex items-center justify-center gap-2">
              <span>Sign In with Zerodha Kite</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
