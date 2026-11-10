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
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DraggableAssetItem } from './DraggableAssetItem'
import { GoalHorizonArcCard } from './GoalHorizonArcCard'
import {
  formatTargetDate,
  calculateProjectedCorpus,
  type GoalNode,
  type SubGoalAllocation,
  type ReorderGoalItem,
} from '@/types/goals'
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
  onReorderSubgoals?: (orders: ReorderGoalItem[]) => Promise<void>
  parentSiblings?: GoalNode[]
  siblingIndex?: number
  siblingCount?: number
  waterfallAllocations?: Map<number, SubGoalAllocation>
  rootGoalTitle?: string
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
  onReorderSubgoals,
  parentSiblings,
  siblingIndex = 0,
  siblingCount = 1,
  waterfallAllocations,
  rootGoalTitle,
  depth = 0,
}: GoalAccordionItemProps) {
  const isRoot = depth === 0
  const [isOpen, setIsOpen] = useState(isRoot)
  const [showAssets, setShowAssets] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Only root goals accept direct asset drops
  const { isOver, setNodeRef } = useDroppable({
    id: `goal-${goal.id}`,
    data: { goalId: goal.id },
    disabled: !isRoot,
  })

  // Collect direct assets assigned to this root goal (including legacy descendant allocations for resilience)
  const getAllDescendantIds = (node: GoalNode): number[] => {
    const ids = [node.id]
    for (const child of node.children || []) {
      ids.push(...getAllDescendantIds(child))
    }
    return ids
  }
  const subtreeIds = new Set(getAllDescendantIds(goal))

  const directAllocations = allAssets
    .map((a) => {
      const alloc = a.allocations.find((al) =>
        isRoot ? subtreeIds.has(al.goal_id) : al.goal_id === goal.id
      )
      return alloc ? { asset: a, percentage: alloc.allocation_percentage } : null
    })
    .filter((item): item is { asset: UnifiedAsset; percentage: number } => item !== null)

  const directCorpus = directAllocations.reduce(
    (sum, { asset, percentage }) => sum + (asset.current_value * percentage) / 100,
    0
  )
  const directInvested = directAllocations.reduce(
    (sum, { asset, percentage }) => sum + (asset.average_price * asset.quantity * percentage) / 100,
    0
  )

  // Waterfall allocation for sub-goals
  const subAlloc = !isRoot ? waterfallAllocations?.get(goal.id) : undefined

  // Effective metrics for display
  const effectiveCovered = isRoot ? directCorpus : (subAlloc?.allocatedCorpus ?? 0)
  const effectiveInvested = isRoot ? directInvested : (subAlloc?.allocatedInvested ?? 0)
  const effectivePnL = effectiveCovered - effectiveInvested
  const effectivePnLPct = effectiveInvested > 0 ? (effectivePnL / effectiveInvested) * 100 : 0

  const target = goal.target_amount
  const isTargetSet = Boolean(target && target > 0)
  const targetGap = isTargetSet ? Math.max(0, target! - effectiveCovered) : null
  const projectedCorpus = calculateProjectedCorpus(target, goal.target_date, 0.07)

  // Priority reordering for sub-goals
  const priorityNumber = siblingIndex + 1
  const isFirstChild = siblingIndex === 0
  const isLastChild = siblingIndex === siblingCount - 1

  const handleMovePriority = async (e: React.MouseEvent, direction: 'up' | 'down') => {
    e.stopPropagation()
    if (!parentSiblings || !onReorderSubgoals) return

    const curIdx = parentSiblings.findIndex((s) => s.id === goal.id)
    if (curIdx === -1) return
    const targetIdx = direction === 'up' ? curIdx - 1 : curIdx + 1
    if (targetIdx < 0 || targetIdx >= parentSiblings.length) return

    const reordered = [...parentSiblings]
    const [moved] = reordered.splice(curIdx, 1)
    reordered.splice(targetIdx, 0, moved)

    const orders: ReorderGoalItem[] = reordered.map((s, i) => ({
      id: s.id,
      display_order: i,
    }))
    await onReorderSubgoals(orders)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const confirmMsg = isRoot
      ? `Delete goal "${goal.title}"? Assigned assets will be moved to unassigned.`
      : `Delete sub-goal "${goal.title}"? Waterfall funds will automatically shift to the next priority sub-goal.`
    if (!confirm(confirmMsg)) {
      return
    }
    setIsDeleting(true)
    try {
      await onDeleteGoal(goal.id)
    } finally {
      setIsDeleting(false)
    }
  }

  // Sort children by display_order ASC, then id ASC
  const sortedChildren = (goal.children || []).slice().sort((a, b) => {
    const orderA = a.display_order ?? 0
    const orderB = b.display_order ?? 0
    if (orderA !== orderB) return orderA - orderB
    return a.id - b.id
  })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border transition-all duration-200 ${
        isOver
          ? 'ring-2 ring-primary border-primary bg-primary/5 shadow-md'
          : 'bg-card border-border hover:border-border/80'
      } ${depth > 0 ? 'ml-3 sm:ml-5 mt-2.5' : 'mt-3'}`}
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

              {/* Priority Badge with reordering controls on Sub-goals */}
              {!isRoot && (
                <div
                  className="inline-flex items-center gap-1.5 bg-muted/70 border border-border px-2 py-0.5 rounded-md text-xs font-mono text-muted-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="font-semibold text-foreground">#{priorityNumber}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Priority</span>
                  {onReorderSubgoals && siblingCount > 1 && (
                    <div className="flex items-center gap-0.5 ml-1 border-l border-border/80 pl-1">
                      <button
                        type="button"
                        disabled={isFirstChild}
                        onClick={(e) => handleMovePriority(e, 'up')}
                        title="Move up priority (fill first)"
                        className="p-0.5 rounded hover:bg-background hover:text-foreground text-muted-foreground disabled:opacity-25 disabled:pointer-events-none transition-colors"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isLastChild}
                        onClick={(e) => handleMovePriority(e, 'down')}
                        title="Move down priority"
                        className="p-0.5 rounded hover:bg-background hover:text-foreground text-muted-foreground disabled:opacity-25 disabled:pointer-events-none transition-colors"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Status pill on Sub-goals */}
              {!isRoot && subAlloc && (
                subAlloc.status === 'funded' ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-medium py-0 h-4.5">
                    100% Funded
                  </Badge>
                ) : subAlloc.status === 'partial' ? (
                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-medium py-0 h-4.5">
                    {subAlloc.percentFunded.toFixed(0)}% Funded
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground text-[10px] font-medium py-0 h-4.5">
                    Queued
                  </Badge>
                )
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
          {/* Drop indicator if asset is being dragged over this root goal */}
          {isRoot && isOver && (
            <div className="p-3 rounded-lg border-2 border-dashed border-primary bg-primary/10 text-center text-xs font-semibold text-primary flex items-center justify-center gap-2 animate-in fade-in">
              <ArrowDownRight className="w-4 h-4" />
              <span>Drop to link asset to "{goal.title}"</span>
            </div>
          )}

          {/* Root Goal: Full Orbital Arc & Compounding Card */}
          {isRoot && (
            <GoalHorizonArcCard
              directInvested={effectiveInvested}
              directPnL={effectivePnL}
              directPnLPct={effectivePnLPct}
              effectiveCovered={effectiveCovered}
              target={target}
              targetGap={targetGap}
              targetDate={goal.target_date}
            />
          )}

          {/* Sub-Goal: Milestone Funding Envelope Card */}
          {!isRoot && (
            <div className="p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card/60 backdrop-blur-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="font-semibold text-foreground/80 uppercase tracking-wider text-[10px]">
                      Milestone Target:
                    </span>
                    <span className="font-medium text-foreground">
                      {target && target > 0 ? formatCurrency(target) : 'Flexible Target'}
                    </span>
                  </div>
                  <div className="text-sm font-semibold tracking-tight text-foreground mt-0.5">
                    {formatCurrency(subAlloc?.allocatedCorpus ?? 0)}
                    <span className="text-xs font-normal text-muted-foreground ml-1.5">
                      {target && target > 0
                        ? `funded (${(subAlloc?.percentFunded ?? 0).toFixed(1)}%)`
                        : 'allocated'}
                    </span>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="flex items-center gap-2">
                  {subAlloc?.status === 'funded' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                      <CheckCircle2 className="w-3 h-3" /> Fully Funded
                    </span>
                  ) : subAlloc?.status === 'partial' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                      <Clock className="w-3 h-3" /> In Progress ({(subAlloc?.percentFunded ?? 0).toFixed(0)}%)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      Queued (Priority #{priorityNumber})
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {target && target > 0 && (
                <div className="space-y-1">
                  <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        subAlloc?.status === 'funded'
                          ? 'bg-emerald-500'
                          : (subAlloc?.percentFunded ?? 0) > 0
                          ? 'bg-primary'
                          : 'bg-transparent'
                      }`}
                      style={{ width: `${Math.min(100, subAlloc?.percentFunded ?? 0)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                    <span>{formatCurrency(subAlloc?.allocatedCorpus ?? 0)}</span>
                    <span>Target: {formatCurrency(target)}</span>
                  </div>
                </div>
              )}

              {/* Cost Basis & Inherited P&L Breakdown */}
              <div className="pt-2 border-t border-border/40 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Invested Basis</span>
                  <span className="font-mono text-foreground font-medium">
                    {formatCurrency(subAlloc?.allocatedInvested ?? 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Attributed P&L</span>
                  <span
                    className={`font-mono font-medium ${
                      (subAlloc?.allocatedCorpus ?? 0) - (subAlloc?.allocatedInvested ?? 0) >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatCurrency((subAlloc?.allocatedCorpus ?? 0) - (subAlloc?.allocatedInvested ?? 0))}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Waterfall Source</span>
                  <span className="text-muted-foreground/80 truncate block text-[11px]" title={`Funded from ${rootGoalTitle || 'Parent Goal'}`}>
                    From {rootGoalTitle || 'Parent Goal'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Root Goal: Collapsible Assets Toggle & List */}
          {isRoot && (
            <>
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
            </>
          )}

          {/* Nested Sub-Goals */}
          {sortedChildren.length > 0 && (
            <div className="pt-2 border-t space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Milestone Sub-Goals ({sortedChildren.length})</span>
                <span className="text-[11px] font-normal normal-case text-muted-foreground/80">
                  Funded in priority order
                </span>
              </div>
              <div className="space-y-2">
                {sortedChildren.map((child, idx) => (
                  <GoalAccordionItem
                    key={child.id}
                    goal={child}
                    allAssets={allAssets}
                    onUnassignAsset={onUnassignAsset}
                    onEditAllocation={onEditAllocation}
                    onDeleteGoal={onDeleteGoal}
                    onOpenCreateSubgoal={onOpenCreateSubgoal}
                    onOpenEditGoal={onOpenEditGoal}
                    onReorderSubgoals={onReorderSubgoals}
                    parentSiblings={sortedChildren}
                    siblingIndex={idx}
                    siblingCount={sortedChildren.length}
                    waterfallAllocations={waterfallAllocations}
                    rootGoalTitle={rootGoalTitle || goal.title}
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
