import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Plus,
  Trash2,
  Calendar,
  ArrowDownRight,
  Edit2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DraggableAssetItem } from './DraggableAssetItem'
import { GoalHorizonArcCard } from './GoalHorizonArcCard'
import { formatTargetDate, calculateProjectedCorpus, type GoalNode } from '@/types/goals'
import type { UnifiedAsset } from '@/types/unifiedAsset'

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val)
}

interface GoalAccordionItemProps {
  goal: GoalNode
  allAssets: UnifiedAsset[]
  onUnassignAsset: (asset: UnifiedAsset, goalId: number) => void
  onEditAllocation?: (asset: UnifiedAsset, goal: GoalNode) => void
  onDeleteGoal: (goalId: number) => Promise<void>
  onOpenCreateSubgoal: (parentGoal: GoalNode) => void
  onOpenEditGoal: (goal: GoalNode) => void
  depth?: number
}

export function GoalAccordionItem({
  goal,
  allAssets,
  onUnassignAsset,
  onEditAllocation,
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

  // Direct allocations assigned to this goal
  const directAllocations = allAssets
    .map((a) => {
      const alloc = a.allocations.find((al) => al.goal_id === goal.id)
      return alloc ? { asset: a, percentage: alloc.allocation_percentage } : null
    })
    .filter((item): item is { asset: UnifiedAsset; percentage: number } => item !== null)

  // Recursive subtree metrics factoring percentage allocations
  const getSubtreeMetrics = (node: GoalNode): { corpus: number; invested: number } => {
    const nodeCorpus = allAssets.reduce((sum, a) => {
      const alloc = a.allocations.find((al) => al.goal_id === node.id)
      if (!alloc) return sum
      return sum + (a.current_value * alloc.allocation_percentage) / 100
    }, 0)
    const nodeInvested = allAssets.reduce((sum, a) => {
      const alloc = a.allocations.find((al) => al.goal_id === node.id)
      if (!alloc) return sum
      return sum + (a.average_price * a.quantity * alloc.allocation_percentage) / 100
    }, 0)

    const childrenMetrics = (node.children || []).reduce(
      (acc, child) => {
        const cm = getSubtreeMetrics(child)
        return {
          corpus: acc.corpus + cm.corpus,
          invested: acc.invested + cm.invested,
        }
      },
      { corpus: 0, invested: 0 }
    )

    return {
      corpus: nodeCorpus + childrenMetrics.corpus,
      invested: nodeInvested + childrenMetrics.invested,
    }
  }

  const directCorpus = directAllocations.reduce(
    (sum, { asset, percentage }) => sum + (asset.current_value * percentage) / 100,
    0
  )
  const directInvested = directAllocations.reduce(
    (sum, { asset, percentage }) => sum + (asset.average_price * asset.quantity * percentage) / 100,
    0
  )

  const subtreeMetrics = getSubtreeMetrics(goal)
  const hasChildren = Boolean(goal.children && goal.children.length > 0)
  const effectiveCovered = hasChildren ? subtreeMetrics.corpus : directCorpus
  const effectiveInvested = hasChildren ? subtreeMetrics.invested : directInvested
  const effectivePnL = effectiveCovered - effectiveInvested
  const effectivePnLPct = effectiveInvested > 0 ? (effectivePnL / effectiveInvested) * 100 : 0

  const target = goal.target_amount
  const isTargetSet = Boolean(target && target > 0)
  const targetGap = isTargetSet ? Math.max(0, target! - effectiveCovered) : null
  const projectedCorpus = calculateProjectedCorpus(target, goal.target_date, 0.07)

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
                  {formatTargetDate(goal.target_date)}
                </span>
              )}

              {projectedCorpus.hasInflation && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded-md font-mono"
                  title={`Nominal target ${formatCurrency(target || 0)} projected to ${formatCurrency(projectedCorpus.projectedAmount)} in ~${projectedCorpus.yearsRemaining}y at 7% inflation`}
                >
                  Proj. {formatCurrency(projectedCorpus.projectedAmount)}
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

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
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

          {/* Orbital Horizon Arc Progress & Metrics Card */}
          <GoalHorizonArcCard
            directInvested={effectiveInvested}
            directPnL={effectivePnL}
            directPnLPct={effectivePnLPct}
            effectiveCovered={effectiveCovered}
            target={target}
            targetGap={targetGap}
            targetDate={goal.target_date}
          />

          {/* Collapsible Assets Toggle */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowAssets(!showAssets)}
              className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 py-1 px-2 -ml-2 rounded-md hover:bg-muted transition-colors"
            >
              <span>{showAssets ? 'Hide Assets List' : `View Linked Assets (${directAllocations.length})`}</span>
              {showAssets ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Assigned assets list - only shown when explicitly toggled or when dragging an asset over */}
          {(showAssets || isOver) && (
            <div className="space-y-2 pt-1 animate-in fade-in duration-150">
              {directAllocations.length > 0 ? (
                <div className="space-y-2">
                  {directAllocations.map(({ asset, percentage }) => (
                    <DraggableAssetItem
                      key={`${goal.id}-${asset.asset_key}`}
                      asset={asset}
                      allocationPercentage={percentage}
                      sourceGoalId={goal.id}
                      onEditAllocation={() => onEditAllocation?.(asset, goal)}
                      onUnassign={() => onUnassignAsset(asset, goal.id)}
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
                    onEditAllocation={onEditAllocation}
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
