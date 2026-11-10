import { useDraggable } from '@dnd-kit/core'
import {
  GripVertical,
  TrendingUp,
  TrendingDown,
  Layers,
  PieChart,
  Percent,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { UnifiedAsset } from '@/types/unifiedAsset'

function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val)
}

function formatPercent(val: number): string {
  const sign = val > 0 ? '+' : ''
  return `${sign}${val.toFixed(1)}%`
}

interface DraggableAssetItemProps {
  asset: UnifiedAsset
  allocationPercentage?: number
  sourceGoalId?: number
  onUnassign?: (asset: UnifiedAsset) => void
  onEditAllocation?: (asset: UnifiedAsset) => void
  isOverlay?: boolean
  isUnassignedView?: boolean
}

export function DraggableAssetItem({
  asset,
  allocationPercentage,
  sourceGoalId,
  onUnassign,
  onEditAllocation,
  isOverlay = false,
  isUnassignedView = false,
}: DraggableAssetItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: isUnassignedView
      ? `unassigned-${asset.asset_key}`
      : sourceGoalId !== undefined
      ? `goal-${sourceGoalId}-asset-${asset.asset_key}`
      : `asset-${asset.asset_key}`,
    data: { asset, sourceGoalId },
    disabled: isOverlay,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const isProfit = asset.pnl >= 0
  const isEquity = asset.asset_type === 'equity'

  // Calculate values based on context
  let displayValue = asset.current_value
  let displayQty = asset.quantity
  let splitBadge: React.ReactNode = null

  if (allocationPercentage !== undefined) {
    displayValue = (asset.current_value * allocationPercentage) / 100
    displayQty = (asset.quantity * allocationPercentage) / 100
    splitBadge = (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onEditAllocation?.(asset)
        }}
        title="Adjust split allocation"
        className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
      >
        <Percent className="w-2.5 h-2.5" />
        <span>{allocationPercentage}%</span>
      </button>
    )
  } else if (isUnassignedView && asset.total_allocated_percentage > 0) {
    displayValue = (asset.current_value * asset.unallocated_percentage) / 100
    displayQty = (asset.quantity * asset.unallocated_percentage) / 100
    splitBadge = (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <span>{asset.unallocated_percentage}% unallocated</span>
      </span>
    )
  }

  const formattedQty = isEquity ? Math.round(displayQty) : displayQty.toFixed(3)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center justify-between gap-3 p-3 rounded-lg border bg-card text-card-foreground transition-all select-none ${
        isDragging
          ? 'opacity-30 border-dashed border-primary shadow-none'
          : 'hover:border-primary/40 hover:shadow-sm'
      } ${isOverlay ? 'shadow-xl border-primary ring-2 ring-primary/20 scale-102 cursor-grabbing' : ''}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Drag handle */}
        <button
          type="button"
          {...listeners}
          {...attributes}
          className="p-1 -ml-1 text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing rounded hover:bg-muted/60 transition-colors"
          title="Drag asset to a goal or unassigned panel"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm tracking-tight text-foreground truncate max-w-[150px] sm:max-w-[180px]">
              {asset.title}
            </span>
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 h-4.5 gap-1 font-mono uppercase ${
                isEquity
                  ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800'
                  : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
              }`}
            >
              {isEquity ? <Layers className="w-2.5 h-2.5" /> : <PieChart className="w-2.5 h-2.5" />}
              {isEquity ? 'Stock' : 'MF'}
            </Badge>

            {splitBadge}
          </div>

          <p className="text-xs text-muted-foreground truncate font-mono">
            {formattedQty} {isEquity ? 'qty' : 'units'} • {formatINR(asset.last_price)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <div className="text-right">
          <div className="font-mono font-semibold text-sm tracking-tight text-foreground">
            {formatINR(displayValue)}
          </div>
          <div
            className={`inline-flex items-center gap-0.5 text-xs font-mono font-medium ${
              isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {formatPercent(asset.pnl_percentage)}
          </div>
        </div>

        {onUnassign && !isOverlay && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onUnassign(asset)
            }}
            title="Unassign from this goal"
            className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

