import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  ArrowDownRight,
  Edit2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DraggableAssetItem } from './DraggableAssetItem'
import type { GoalNode } from '@/types/goals'
import type { UnifiedAsset } from '@/types/unifiedAsset'

function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val)
}

interface GoalAccordionItemProps {
  goal: GoalNode
  allAssets: UnifiedAsset[]
  onUnassignAsset: (asset: UnifiedAsset) => void
  onDeleteGoal: (goalId: number) => Promise<void>
  onOpenCreateSubgoal: (parentGoal: GoalNode) => void
  onOpenEditGoal: (goal: GoalNode) => void
  depth?: number
}

export function GoalAccordionItem({
  goal,
  allAssets,
  onUnassignAsset,
  onDeleteGoal,
  onOpenCreateSubgoal,
  onOpenEditGoal,
  depth = 0,
}: GoalAccordionItemProps) {
  const [isOpen, setIsOpen] = useState(depth === 0)
  const [showAssets, setShowAssets] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { isOver, setNodeRef } = useDroppable({
    id: `goal-${goal.id}`,
    data: { goalId: goal.id },
  })

  // Direct assets assigned to this goal
  const directAssets = allAssets.filter((a) => a.goal_id === goal.id)

  // Recursive subtree corpus
  const getSubtreeCorpus = (node: GoalNode): number => {
    const nodeCorpus = allAssets
      .filter((a) => a.goal_id === node.id)
      .reduce((sum, a) => sum + a.current_value, 0)
    const childrenCorpus = (node.children || []).reduce(
      (sum, child) => sum + getSubtreeCorpus(child),
      0
    )
    return nodeCorpus + childrenCorpus
  }

  const directCorpus = directAssets.reduce((sum, a) => sum + a.current_value, 0)
  const directInvested = directAssets.reduce((sum, a) => sum + a.average_price * a.quantity, 0)
  const directPnL = directAssets.reduce((sum, a) => sum + a.pnl, 0)
  const directPnLPct = directInvested > 0 ? (directPnL / directInvested) * 100 : 0

  const equityAssets = directAssets.filter((a) => a.asset_type === 'equity')
  const equityVal = equityAssets.reduce((sum, a) => sum + a.current_value, 0)
  const equityPct = directCorpus > 0 ? Math.round((equityVal / directCorpus) * 100) : 0

  const mfAssets = directAssets.filter((a) => a.asset_type === 'mf')
  const mfVal = mfAssets.reduce((sum, a) => sum + a.current_value, 0)
  const mfPct = directCorpus > 0 ? Math.round((mfVal / directCorpus) * 100) : 0

  const totalSubtreeCorpus = getSubtreeCorpus(goal)

  const target = goal.target_amount
  const progressPct = target && target > 0 ? Math.min(100, (totalSubtreeCorpus / target) * 100) : null
  const targetGap = target ? Math.max(0, target - totalSubtreeCorpus) : null

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete goal "${goal.title}"? Assigned assets will be moved to unassigned.`)) {
      return
    }
    setIsDeleting(true)
    try {
      await onDeleteGoal(goal.id)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border transition-all duration-200 ${
        isOver
          ? 'ring-2 ring-primary border-primary bg-primary/5 shadow-md'
          : 'bg-card border-border hover:border-border/80'
      } ${depth > 0 ? 'ml-4 sm:ml-6 mt-2.5' : 'mt-3'}`}
    >
      {/* Accordion Header / Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-base tracking-tight text-foreground">
                {goal.title}
              </span>

              {depth > 0 && (
                <Badge variant="outline" className="text-[10px] font-normal py-0 h-4.5">
                  Sub-Goal
                </Badge>
              )}

              {goal.target_date && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                  <Calendar className="w-3 h-3" />
                  {goal.target_date}
                </span>
              )}
            </div>

            {goal.description && (
              <p className="text-xs text-muted-foreground truncate max-w-lg">
                {goal.description}
              </p>
            )}
          </div>
        </div>

        {/* Financial Metrics & Actions */}
        <div className="flex items-center justify-between md:justify-end gap-3.5 shrink-0 pl-6 md:pl-0">
          <div className="text-right space-y-1 min-w-[130px]">
            <div className="flex items-center justify-end gap-1.5 font-mono font-bold text-sm text-foreground">
              <span>{formatINR(totalSubtreeCorpus)}</span>
              {progressPct !== null && progressPct >= 100 && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              )}
            </div>

            {target && target > 0 ? (
              <div className="space-y-1">
                <div className="flex items-center justify-end gap-1.5 text-[11px] font-mono text-muted-foreground">
                  <span>Target: {formatINR(target)}</span>
                  <span className="font-medium text-foreground">{progressPct?.toFixed(0)}%</span>
                </div>
                <div className="w-28 sm:w-36 h-1.5 bg-muted rounded-full overflow-hidden ml-auto">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, progressPct ?? 0)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground font-mono">
                {directAssets.length} {directAssets.length === 1 ? 'asset' : 'assets'}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onOpenCreateSubgoal(goal)}
              title="Add a nested sub-goal"
              className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-xs flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sub-Goal</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenEditGoal(goal)}
              title="Edit goal"
              className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete goal"
              className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Accordion Content Body */}
      {isOpen && (
        <div className="p-3.5 sm:p-4 border-t bg-muted/20 space-y-3.5">
          {/* Drop indicator if asset is being dragged over this goal */}
          {isOver && (
            <div className="p-3 rounded-lg border-2 border-dashed border-primary bg-primary/10 text-center text-xs font-semibold text-primary flex items-center justify-center gap-2 animate-in fade-in">
              <ArrowDownRight className="w-4 h-4" />
              <span>Drop to link asset to "{goal.title}"</span>
            </div>
          )}

          {/* Goal Analytics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-card rounded-lg border text-xs space-y-1">
              <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">Invested Capital</div>
              <div className="font-mono font-semibold text-sm text-foreground">{formatINR(directInvested)}</div>
            </div>
            <div className="p-3 bg-card rounded-lg border text-xs space-y-1">
              <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">Direct Corpus</div>
              <div className="font-mono font-semibold text-sm text-foreground">{formatINR(directCorpus)}</div>
            </div>
            <div className="p-3 bg-card rounded-lg border text-xs space-y-1">
              <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">Goal Returns</div>
              <div className={`font-mono font-semibold text-sm ${directPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatINR(directPnL)} ({directPnL >= 0 ? '+' : ''}{directPnLPct.toFixed(1)}%)
              </div>
            </div>
            <div className="p-3 bg-card rounded-lg border text-xs space-y-1">
              <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">Target Gap</div>
              <div className="font-mono font-semibold text-sm text-foreground">
                {targetGap !== null ? formatINR(targetGap) : 'Open-Ended'}
              </div>
            </div>
          </div>

          {/* Asset Allocation Breakdown (Equity vs Mutual Funds) */}
          {directCorpus > 0 && (
            <div className="p-3 bg-card rounded-lg border text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
                  Stocks: {equityPct}% ({formatINR(equityVal)})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  Mutual Funds: {mfPct}% ({formatINR(mfVal)})
                </span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                <div className="bg-sky-500 h-full transition-all duration-300" style={{ width: `${equityPct}%` }} />
                <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${mfPct}%` }} />
              </div>
            </div>
          )}

          {/* Collapsible Assets Toggle */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowAssets(!showAssets)}
              className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 py-1 px-2 -ml-2 rounded-md hover:bg-muted transition-colors"
            >
              <span>{showAssets ? 'Hide Assets List' : `View Linked Assets (${directAssets.length})`}</span>
              {showAssets ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Assigned assets list - only shown when explicitly toggled or when dragging an asset over */}
          {(showAssets || isOver) && (
            <div className="space-y-2 pt-1 animate-in fade-in duration-150">
              {directAssets.length > 0 ? (
                <div className="space-y-2">
                  {directAssets.map((asset) => (
                    <DraggableAssetItem
                      key={asset.asset_key}
                      asset={asset}
                      onUnassign={() => onUnassignAsset(asset)}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-6 px-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground bg-card/50">
                  No assets assigned yet. Drag an asset from the Unassigned Assets panel to link it.
                </div>
              )}
            </div>
          )}

          {/* Nested Sub-Goals */}
          {goal.children && goal.children.length > 0 && (
            <div className="pt-2 border-t space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Sub-Goals ({goal.children.length})
              </div>
              <div className="space-y-2">
                {goal.children.map((child) => (
                  <GoalAccordionItem
                    key={child.id}
                    goal={child}
                    allAssets={allAssets}
                    onUnassignAsset={onUnassignAsset}
                    onDeleteGoal={onDeleteGoal}
                    onOpenCreateSubgoal={onOpenCreateSubgoal}
                    onOpenEditGoal={onOpenEditGoal}
                    depth={depth + 1}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
