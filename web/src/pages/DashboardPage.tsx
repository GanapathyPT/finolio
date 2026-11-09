import { useState } from 'react'
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  Clock,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/Header'
import { useAuth } from '@/hooks/useAuth'
import { usePortfolio } from '@/hooks/usePortfolio'

function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(val)
}

function formatPercent(val: number): string {
  const sign = val > 0 ? '+' : ''
  return `${sign}${val.toFixed(2)}%`
}

export function DashboardPage() {
  const { auth } = useAuth()
  const { portfolio, isLoading, isSyncing, sync, syncError } = usePortfolio()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'equity' | 'mf'>('equity')

  const user = auth.user
  if (!user) {
    return null
  }

  const handleSync = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    setErrorMessage(null)
    try {
      await sync()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message)
      } else {
        setErrorMessage('Failed to sync holdings')
      }
    }
  }

  const summary = portfolio?.summary
  const equityHoldings = portfolio?.equity_holdings || []
  const mfHoldings = portfolio?.mf_holdings || []
  const hasAssets = equityHoldings.length > 0 || mfHoldings.length > 0

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        {/* Top Header / Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Holdings & Assets
            </h1>
            <p className="text-muted-foreground text-sm">
              Your consolidated equity delivery stocks and mutual funds from Zerodha.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {summary?.last_synced_at && (
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Synced {new Date(summary.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Button
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              size="sm"
              className="gap-2 font-medium"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Holdings'}
            </Button>
          </div>
        </div>

        {/* Sync error alert */}
        {(errorMessage || syncError) && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{errorMessage || (syncError instanceof Error ? syncError.message : 'Failed to sync with Kite')}</p>
          </div>
        )}

        {/* Portfolio Summary Cards */}
        {summary && hasAssets && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Current Value */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Portfolio Value
                </CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-bold tracking-tight">
                  {formatINR(summary.current_value)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Invested: <span className="font-medium text-foreground">{formatINR(summary.total_investment)}</span> ({summary.equity_count} stocks, {summary.mf_count} MFs)
                </div>
              </CardContent>
            </Card>

            {/* Total P&L */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Profit & Loss
                </CardTitle>
                {summary.total_pnl >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-rose-500" />
                )}
              </CardHeader>
              <CardContent className="space-y-1">
                <div className={`text-2xl font-bold tracking-tight ${summary.total_pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatINR(summary.total_pnl)}
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={`inline-flex items-center font-medium ${summary.total_pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {summary.total_pnl >= 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    )}
                    {formatPercent(summary.total_pnl_percentage)}
                  </span>
                  <span className="text-muted-foreground">overall returns</span>
                </div>
              </CardContent>
            </Card>

            {/* Day's P&L */}
            <Card className="sm:col-span-2 lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Today's Equity Change
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-1">
                <div className={`text-2xl font-bold tracking-tight ${summary.day_pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {formatINR(summary.day_pnl)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Unrealized market move today
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab Navigation & Assets Display */}
        {hasAssets ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('equity')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'equity'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>Equity Stocks</span>
                <Badge variant={activeTab === 'equity' ? 'outline' : 'secondary'} className="ml-1 text-xs">
                  {equityHoldings.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('mf')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'mf'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <PieChart className="h-4 w-4" />
                <span>Mutual Funds</span>
                <Badge variant={activeTab === 'mf' ? 'outline' : 'secondary'} className="ml-1 text-xs">
                  {mfHoldings.length}
                </Badge>
              </button>
            </div>

            {/* Active Tab: Equity Holdings */}
            {activeTab === 'equity' && (
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">Equity Segment Holdings</CardTitle>
                      <CardDescription>
                        Cash-and-Carry delivery shares settled in your Demat account.
                      </CardDescription>
                    </div>
                    {summary && (
                      <span className="text-xs font-mono text-muted-foreground">
                        Value: {formatINR(summary.equity_current_value)}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {equityHoldings.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead>
                          <tr className="border-t border-b bg-muted/40 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            <th className="py-3 px-4">Instrument</th>
                            <th className="py-3 px-4 text-right">Qty</th>
                            <th className="py-3 px-4 text-right">Avg. Price</th>
                            <th className="py-3 px-4 text-right">LTP</th>
                            <th className="py-3 px-4 text-right">Cur. Value</th>
                            <th className="py-3 px-4 text-right">P&L</th>
                            <th className="py-3 px-4 text-right">Day Chg</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {equityHoldings.map((h) => {
                            const curValue = h.quantity * h.last_price
                            const isProfit = h.pnl >= 0
                            const isDayPositive = h.day_change >= 0

                            return (
                              <tr key={h.id} className="hover:bg-muted/30 transition-colors">
                                <td className="py-3.5 px-4 font-medium">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-foreground tracking-tight">
                                      {h.tradingsymbol}
                                    </span>
                                    <span className="text-xs text-muted-foreground font-mono">
                                      {h.exchange} • {h.isin}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono">
                                  {h.quantity}
                                  {h.t1_quantity > 0 && (
                                    <span className="text-xs text-muted-foreground block">
                                      (+{h.t1_quantity} T1)
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                                  {formatINR(h.average_price)}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-medium">
                                  {formatINR(h.last_price)}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-medium">
                                  {formatINR(curValue)}
                                </td>
                                <td className={`py-3.5 px-4 text-right font-mono font-medium ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  <div>{formatINR(h.pnl)}</div>
                                  <div className="text-xs opacity-80">
                                    {h.average_price > 0
                                      ? formatPercent(((h.last_price - h.average_price) / h.average_price) * 100)
                                      : '0.00%'}
                                  </div>
                                </td>
                                <td className={`py-3.5 px-4 text-right font-mono text-xs font-medium ${isDayPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {formatPercent(h.day_change_percentage)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No equity holdings recorded.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Active Tab: Mutual Funds */}
            {activeTab === 'mf' && (
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">Mutual Fund Holdings</CardTitle>
                      <CardDescription>
                        Direct mutual fund schemes held through Zerodha Coin.
                      </CardDescription>
                    </div>
                    {summary && (
                      <span className="text-xs font-mono text-muted-foreground">
                        Value: {formatINR(summary.mf_current_value)}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {mfHoldings.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead>
                          <tr className="border-t border-b bg-muted/40 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            <th className="py-3 px-4">Fund Scheme</th>
                            <th className="py-3 px-4 text-right">Units</th>
                            <th className="py-3 px-4 text-right">Avg. NAV</th>
                            <th className="py-3 px-4 text-right">Last NAV</th>
                            <th className="py-3 px-4 text-right">Cur. Value</th>
                            <th className="py-3 px-4 text-right">P&L</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {mfHoldings.map((mf) => {
                            const curValue = mf.quantity * mf.last_price
                            const isProfit = mf.pnl >= 0

                            return (
                              <tr key={mf.id} className="hover:bg-muted/30 transition-colors">
                                <td className="py-3.5 px-4 font-medium">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-foreground tracking-tight">
                                      {mf.fund}
                                    </span>
                                    <span className="text-xs text-muted-foreground font-mono">
                                      Folio: {mf.folio} • {mf.tradingsymbol}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono">
                                  {mf.quantity.toFixed(3)}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                                  {formatINR(mf.average_price)}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-medium">
                                  {formatINR(mf.last_price)}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-medium">
                                  {formatINR(curValue)}
                                </td>
                                <td className={`py-3.5 px-4 text-right font-mono font-medium ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  <div>{formatINR(mf.pnl)}</div>
                                  <div className="text-xs opacity-80">
                                    {mf.average_price > 0
                                      ? formatPercent(((mf.last_price - mf.average_price) / mf.average_price) * 100)
                                      : '0.00%'}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No mutual fund holdings recorded.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ) : !isLoading ? (
          /* Empty State */
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10 text-primary">
                <Layers className="h-8 w-8" />
              </div>
              <div className="space-y-1.5 max-w-md">
                <h3 className="font-semibold text-lg">No Assets Recorded Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Click the button below to fetch and store your equity holdings and mutual funds directly from Zerodha Kite.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleSync}
                disabled={isSyncing}
                className="gap-2 shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing from Kite...' : 'Sync Holdings Now'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="py-12 flex justify-center text-sm text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            Loading portfolio data...
          </div>
        )}
      </main>
    </div>
  )
}
