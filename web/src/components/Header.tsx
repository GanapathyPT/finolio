import { User, LogOut } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'
import { useAuth } from '@/hooks/useAuth'

export function Header() {
  const { auth, logout } = useAuth()

  if (!auth.user) {
    return null
  }

  return (
    <header className="border-b bg-card/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo size={28} showText />
          <Badge variant="secondary" className="text-xs font-mono ml-1">
            Zerodha Kite
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-muted/30 text-xs font-medium">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{auth.user.user_name}</span>
            <span className="text-muted-foreground font-mono">({auth.user.kite_id})</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}

