import { useState } from 'react'
import { PieChart, Layers, Minus, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { UnifiedAsset } from '@/types/unifiedAsset'
import type { GoalNode } from '@/types/goals'

function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val)
}

interface SplitAllocationDialogProps {
  isOpen: boolean
  onClose: () => void
  asset: UnifiedAsset | null
  goal: GoalNode | null
  onConfirm: (asset: UnifiedAsset, goalId: number, percentage: number) => Promise<void>
}

export function SplitAllocationDialog(props: SplitAllocationDialogProps) {
  if (!props.isOpen || !props.asset || !props.goal) return null
  return <SplitAllocationModalContent {...props} asset={props.asset} goal={props.goal} />
}

interface SplitAllocationModalContentProps {
  onClose: () => void
  asset: UnifiedAsset
  goal: GoalNode
  onConfirm: (asset: UnifiedAsset, goalId: number, percentage: number) => Promise<void>
}

function SplitAllocationModalContent({
  onClose,
  asset,
  goal,
  onConfirm,
}: SplitAllocationModalContentProps) {
  const currentAllocation = asset.allocations.find((a) => a.goal_id === goal.id)?.allocation_percentage ?? 0
  const maxAllowed = Math.min(100, currentAllocation + asset.unallocated_percentage)

  const [percentage, setPercentage] = useState<number>(() => {
    if (currentAllocation > 0) {
      return currentAllocation
    }
    const def = Math.floor(maxAllowed / 10) * 10
    return def >= 10 ? def : 10
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEquity = asset.asset_type === 'equity'
  const isNoHeadroom = maxAllowed < 10

  const handleStep = (delta: number) => {
    setPercentage((prev) => {
      const next = prev + delta
      if (next < 10) return 10
      if (next > maxAllowed) return maxAllowed
      return next
    })
  }

  const handleSelectPill = (val: number) => {
    if (val <= maxAllowed && val >= 10) {
      setPercentage(val)
    }
  }

  const handleSave = async () => {
    if (percentage < 10 || percentage > maxAllowed || percentage % 10 !== 0) {
      setError('Allocation must be at least 10% and in multiples of 10.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await onConfirm(asset, goal.id, percentage)
      onClose()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to update allocation')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await onConfirm(asset, goal.id, 0)
      onClose()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to remove asset from goal')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const effectiveValue = (asset.current_value * percentage) / 100
  const effectiveQty = (asset.quantity * percentage) / 100
  const remainingUnallocated = maxAllowed - percentage

  // Pre-configured percentage quick buttons
  const percentageOptions = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].filter(
    (p) => p <= maxAllowed
  )

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-card border text-card-foreground rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b pb-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Split Asset Allocation</h2>
            <p className="text-xs text-muted-foreground">
              Allocate a percentage of this asset to goal{' '}
              <span className="font-semibold text-foreground">"{goal.title}"</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Asset Summary Pill */}
        <div className="p-3 bg-muted/40 rounded-xl border flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{asset.title}</span>
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 h-4 gap-1 font-mono uppercase ${
                  isEquity
                    ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800'
                    : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                }`}
              >
                {isEquity ? <Layers className="w-2.5 h-2.5" /> : <PieChart className="w-2.5 h-2.5" />}
                {isEquity ? 'Stock' : 'MF'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Total: {asset.quantity} {isEquity ? 'shares' : 'units'} • {formatINR(asset.current_value)}
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs font-mono font-medium text-foreground">
              {maxAllowed}% available
            </div>
            {currentAllocation > 0 && (
              <div className="text-[10px] text-muted-foreground font-mono">
                Currently {currentAllocation}%
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg text-xs font-medium bg-destructive/10 border border-destructive/30 text-destructive">
            {error}
          </div>
        )}

        {isNoHeadroom ? (
          <div className="py-6 text-center space-y-2">
            <p className="text-sm font-medium text-destructive">No allocation headroom remaining</p>
            <p className="text-xs text-muted-foreground">
              This asset is already 100% allocated to other goals. Reduce or remove its allocation from other goals before assigning it here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Split Stepper & Percentage Display */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>Allocation Percentage (multiples of 10%)</span>
                <span className="font-mono text-foreground font-semibold">Min 10% • Max {maxAllowed}%</span>
              </div>

              <div className="flex items-center justify-center gap-4 py-3 bg-muted/20 border rounded-xl">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => handleStep(-10)}
                  disabled={percentage <= 10}
                >
                  <Minus className="w-4 h-4" />
                </Button>

                <div className="w-24 text-center">
                  <div className="text-3xl font-mono font-bold tracking-tight text-primary">
                    {percentage}%
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => handleStep(10)}
                  disabled={percentage >= maxAllowed}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Quick Percentage Pills */}
            <div className="space-y-1.5">
              <div className="text-[11px] text-muted-foreground font-medium">Quick Select</div>
              <div className="flex items-center flex-wrap gap-1.5">
                {percentageOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectPill(opt)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                      percentage === opt
                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {opt}%
                  </button>
                ))}
              </div>
            </div>

            {/* Allocation Impact Card */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 border rounded-xl text-xs font-mono">
              <div className="space-y-0.5">
                <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Goal Value</div>
                <div className="font-semibold text-foreground text-sm">{formatINR(effectiveValue)}</div>
                <div className="text-[10px] text-muted-foreground">
                  ~{isEquity ? Math.round(effectiveQty) : effectiveQty.toFixed(3)} {isEquity ? 'shares' : 'units'}
                </div>
              </div>

              <div className="space-y-0.5 text-right">
                <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Remaining Unallocated</div>
                <div className="font-semibold text-foreground text-sm">{remainingUnallocated}%</div>
                <div className="text-[10px] text-muted-foreground">
                  {formatINR((asset.current_value * remainingUnallocated) / 100)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          {currentAllocation > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={isSubmitting}
              className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Unassign</span>
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>

            {!isNoHeadroom && (
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={isSubmitting}
                className="text-xs font-medium"
              >
                {isSubmitting ? 'Saving...' : 'Confirm Allocation'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
