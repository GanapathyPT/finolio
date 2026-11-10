import { useState, useMemo, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  RefreshCw,
  Clock,
  Plus,
  Layers,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/Header'
import { useAuth } from '@/hooks/useAuth'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useGoals } from '@/hooks/useGoals'
import { useToast } from '@/hooks/useToast'
import { UnassignedAssetsPanel } from '@/components/goals/UnassignedAssetsPanel'
import { GoalAccordionItem } from '@/components/goals/GoalAccordionItem'
import { DraggableAssetItem } from '@/components/goals/DraggableAssetItem'
import { GoalDialog } from '@/components/goals/GoalDialog'
import { SplitAllocationDialog } from '@/components/goals/SplitAllocationDialog'
import type {
  GoalNode,
  CreateGoalRequest,
  UpdateGoalRequest,
  ReorderGoalItem,
  SubGoalAllocation,
} from '@/types/goals'
import { calculateBranchWaterfall } from '@/types/goals'
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
  return `${sign}${val.toFixed(2)}%`
}

export function DashboardPage() {
  const { auth } = useAuth()
  const { portfolio, isLoading: isPortfolioLoading, isSyncing, sync, syncError } = usePortfolio()
  const {
    goals,
    isLoading: isGoalsLoading,
    createGoal,
    updateGoal,
    deleteGoal,
    assignAsset,
    reorderGoals,
  } = useGoals()
  const { error: showErrorToast } = useToast()

  // Notify on Kite sync error via top-right toast
  useEffect(() => {
    if (syncError) {
      showErrorToast(
        syncError instanceof Error ? syncError.message : 'Failed to sync with Kite',
        'Kite Sync Failed'
      )
    }
  }, [syncError, showErrorToast])

  // Drag-and-drop active item
  const [activeAsset, setActiveAsset] = useState<UnifiedAsset | null>(null)

  // Goal Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [parentGoal, setParentGoal] = useState<GoalNode | null>(null)
  const [editingGoal, setEditingGoal] = useState<GoalNode | null>(null)

  // Split Allocation Dialog states
  const [splitDialogOpen, setSplitDialogOpen] = useState(false)
  const [splitAsset, setSplitAsset] = useState<UnifiedAsset | null>(null)
  const [splitGoal, setSplitGoal] = useState<GoalNode | null>(null)

  // Configure pointer sensor with activation distance to avoid accidental drags on click
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  )

  const summary = portfolio?.summary
  const equityHoldings = portfolio?.equity_holdings
  const mfHoldings = portfolio?.mf_holdings

  // Helper to find goal node by ID in tree
  const findGoalInTree = (nodes: GoalNode[], id: number): GoalNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n
      if (n.children && n.children.length > 0) {
        const found = findGoalInTree(n.children, id)
        if (found) return found
      }
    }
    return null
  }

  // Combine equity and mutual funds into unified draggable assets
  const unifiedAssets: UnifiedAsset[] = useMemo(() => {
    const list: UnifiedAsset[] = []

    equityHoldings?.forEach((h) => {
      const curVal = h.quantity * h.last_price
      const invVal = h.quantity * h.average_price
      const pnl = h.pnl !== undefined && h.pnl !== null && h.pnl !== 0 ? h.pnl : (curVal - invVal)
      const pnlPct = invVal > 0 ? (pnl / invVal) * 100 : 0
      const allocs = h.allocations && h.allocations.length > 0
        ? h.allocations
        : h.goal_id !== null && h.goal_id !== undefined
        ? [{ goal_id: h.goal_id, allocation_percentage: 100 }]
        : []
      const totalPercent = h.total_allocated_percent ?? allocs.reduce((s, a) => s + a.allocation_percentage, 0)
      const unalloc = Math.max(0, 100 - totalPercent)

      list.push({
        id: h.id,
        asset_type: 'equity',
        asset_key: h.asset_key || `${h.tradingsymbol}:${h.exchange}`,
        title: h.tradingsymbol,
        subtitle: `${h.exchange} • ${h.isin}`,
        quantity: h.quantity,
        average_price: h.average_price,
        last_price: h.last_price,
        current_value: curVal,
        pnl: pnl,
        pnl_percentage: pnlPct,
        goal_id: h.goal_id ?? (allocs.length === 1 && allocs[0].allocation_percentage === 100 ? allocs[0].goal_id : null),
        allocations: allocs,
        total_allocated_percentage: totalPercent,
        unallocated_percentage: unalloc,
      })
    })

    mfHoldings?.forEach((m) => {
      const curVal = m.quantity * m.last_price
      const invVal = m.quantity * m.average_price
      const pnl = m.pnl !== undefined && m.pnl !== null && m.pnl !== 0 ? m.pnl : (curVal - invVal)
      const pnlPct = invVal > 0 ? (pnl / invVal) * 100 : 0
      const allocs = m.allocations && m.allocations.length > 0
        ? m.allocations
        : m.goal_id !== null && m.goal_id !== undefined
        ? [{ goal_id: m.goal_id, allocation_percentage: 100 }]
        : []
      const totalPercent = m.total_allocated_percent ?? allocs.reduce((s, a) => s + a.allocation_percentage, 0)
      const unalloc = Math.max(0, 100 - totalPercent)

      list.push({
        id: m.id,
        asset_type: 'mf',
        asset_key: m.asset_key || `${m.folio}:${m.fund}`,
        title: m.fund,
        subtitle: `Folio: ${m.folio || 'N/A'} • ${m.tradingsymbol}`,
        quantity: m.quantity,
        average_price: m.average_price,
        last_price: m.last_price,
        current_value: curVal,
        pnl: pnl,
        pnl_percentage: pnlPct,
        goal_id: m.goal_id ?? (allocs.length === 1 && allocs[0].allocation_percentage === 100 ? allocs[0].goal_id : null),
        allocations: allocs,
        total_allocated_percentage: totalPercent,
        unallocated_percentage: unalloc,
      })
    })

    return list
  }, [equityHoldings, mfHoldings])

  // Branch-first waterfall funding calculations across all root goal hierarchies
  const allWaterfallAllocations = useMemo(() => {
    const masterMap = new Map<number, SubGoalAllocation>()

    const getAllDescendantIds = (node: GoalNode): number[] => {
      const ids = [node.id]
      for (const child of node.children || []) {
        ids.push(...getAllDescendantIds(child))
      }
      return ids
    }

    for (const root of goals) {
      if (root.parent_id !== null) continue

      const subtreeIds = new Set(getAllDescendantIds(root))
      const rootCorpus = unifiedAssets.reduce((sum, a) => {
        const alloc = a.allocations.find((al) => subtreeIds.has(al.goal_id))
        if (!alloc) return sum
        return sum + (a.current_value * alloc.allocation_percentage) / 100
      }, 0)

      const rootInvested = unifiedAssets.reduce((sum, a) => {
        const alloc = a.allocations.find((al) => subtreeIds.has(al.goal_id))
        if (!alloc) return sum
        return sum + (a.average_price * a.quantity * alloc.allocation_percentage) / 100
      }, 0)

      const branchMap = calculateBranchWaterfall(root, rootCorpus, rootInvested)
      for (const [id, alloc] of branchMap.entries()) {
        masterMap.set(id, alloc)
      }
    }

    return masterMap
  }, [goals, unifiedAssets])

  const user = auth.user
  if (!user) return null

  const hasAssets = (equityHoldings && equityHoldings.length > 0) || (mfHoldings && mfHoldings.length > 0)
  const hasUnassignedAssets = unifiedAssets.some((a) => a.unallocated_percentage > 0)

  const handleSync = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    try {
      await sync()
    } catch (err: unknown) {
      if (err instanceof Error) {
        showErrorToast(err.message, 'Sync Failed')
      } else {
        showErrorToast('Failed to sync holdings', 'Sync Failed')
      }
    }
  }

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const rawData = event.active.data.current as
      | { asset?: UnifiedAsset; sourceGoalId?: number }
      | UnifiedAsset
      | undefined
    if (rawData) {
      const asset = 'asset' in rawData && rawData.asset ? rawData.asset : (rawData as UnifiedAsset)
      setActiveAsset(asset)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveAsset(null)

    if (!over) return

    const rawData = active.data.current as
      | { asset?: UnifiedAsset; sourceGoalId?: number }
      | UnifiedAsset
      | undefined
    if (!rawData) return

    const asset = 'asset' in rawData && rawData.asset ? rawData.asset : (rawData as UnifiedAsset)
    const sourceGoalId = 'sourceGoalId' in rawData ? rawData.sourceGoalId : undefined
    const overId = String(over.id)

    try {
      if (overId === 'unassigned') {
        if (sourceGoalId !== undefined) {
          // Unassign specifically from the goal where it was dragged from
          await assignAsset({
            asset_type: asset.asset_type,
            asset_key: asset.asset_key,
            goal_id: sourceGoalId,
            allocation_percentage: 0,
          })
        } else if (asset.allocations.length > 0) {
          // Clear all allocations if dragged from a generic view
          await assignAsset({
            asset_type: asset.asset_type,
            asset_key: asset.asset_key,
            goal_id: null,
          })
        }
      } else if (overId.startsWith('goal-')) {
        const targetGoalId = parseInt(overId.replace('goal-', ''), 10)
        if (isNaN(targetGoalId)) return

        // If dropped onto the same goal it was dragged from -> no-op
        if (sourceGoalId !== undefined && sourceGoalId === targetGoalId) {
          return
        }

        const targetGoal = findGoalInTree(goals, targetGoalId)
        if (!targetGoal) return

        // Restrict asset allocation to root goals only
        if (targetGoal.parent_id !== null) {
          showErrorToast(
            'Assets can only be linked to root goals. Funds cascade to sub-goals automatically in priority order.',
            'Allocation Restricted'
          )
          return
        }

        // Case 1: Direct Goal-to-Goal Transfer (moving asset from Goal A to Goal B)
        if (sourceGoalId !== undefined && sourceGoalId !== targetGoalId) {
          const sourceAlloc =
            asset.allocations.find((a) => a.goal_id === sourceGoalId)?.allocation_percentage ?? 0
          if (sourceAlloc <= 0) return

          const existingTargetAlloc =
            asset.allocations.find((a) => a.goal_id === targetGoalId)?.allocation_percentage ?? 0
          const newTargetAlloc = Math.min(100, existingTargetAlloc + sourceAlloc)

          // 1. Remove from source goal
          await assignAsset({
            asset_type: asset.asset_type,
            asset_key: asset.asset_key,
            goal_id: sourceGoalId,
            allocation_percentage: 0,
          })

          // 2. Assign to target goal
          await assignAsset({
            asset_type: asset.asset_type,
            asset_key: asset.asset_key,
            goal_id: targetGoalId,
            allocation_percentage: newTargetAlloc,
          })

          return
        }

        // Case 2: Dragged from Unassigned Panel
        const existingAlloc = asset.allocations.find((a) => a.goal_id === targetGoalId)
        const available = (existingAlloc?.allocation_percentage ?? 0) + asset.unallocated_percentage

        if (available < 10) {
          showErrorToast(
            `Cannot allocate "${asset.title}": 100% is already allocated across other goals. Adjust existing allocations first.`,
            'Allocation Limit'
          )
          return
        }

        setSplitAsset(asset)
        setSplitGoal(targetGoal)
        setSplitDialogOpen(true)
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        showErrorToast(err.message, 'Assignment Failed')
      } else {
        showErrorToast('Failed to update asset assignment', 'Assignment Failed')
      }
    }
  }

  const handleUnassignAsset = async (asset: UnifiedAsset, goalId?: number) => {
    try {
      if (goalId !== undefined) {
        await assignAsset({
          asset_type: asset.asset_type,
          asset_key: asset.asset_key,
          goal_id: goalId,
          allocation_percentage: 0,
        })
      } else {
        await assignAsset({
          asset_type: asset.asset_type,
          asset_key: asset.asset_key,
          goal_id: null,
        })
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        showErrorToast(err.message, 'Unassign Failed')
      }
    }
  }

  const handleEditAllocation = (asset: UnifiedAsset, goal: GoalNode) => {
    setSplitAsset(asset)
    setSplitGoal(goal)
    setSplitDialogOpen(true)
  }

  const handleConfirmSplit = async (asset: UnifiedAsset, goalId: number, percentage: number) => {
    await assignAsset({
      asset_type: asset.asset_type,
      asset_key: asset.asset_key,
      goal_id: goalId,
      allocation_percentage: percentage,
    })
  }

  const handleOpenCreateRootGoal = () => {
    setParentGoal(null)
    setEditingGoal(null)
    setIsDialogOpen(true)
  }

  const handleOpenCreateSubgoal = (parent: GoalNode) => {
    setParentGoal(parent)
    setEditingGoal(null)
    setIsDialogOpen(true)
  }

  const handleOpenEditGoal = (goal: GoalNode) => {
    setParentGoal(null)
    setEditingGoal(goal)
    setIsDialogOpen(true)
  }

  const handleCreateGoalSubmit = async (req: CreateGoalRequest) => {
    await createGoal(req)
  }

  const handleUpdateGoalSubmit = async (id: number, req: UpdateGoalRequest) => {
    await updateGoal({ id, req })
  }

  const handleDeleteGoal = async (goalId: number) => {
    await deleteGoal(goalId)
  }

  const handleReorderSubgoals = async (orders: ReorderGoalItem[]) => {
    try {
      await reorderGoals({ orders })
    } catch (err: unknown) {
      if (err instanceof Error) {
        showErrorToast(err.message, 'Failed to reorder priority')
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Financial Goals
              </h1>
              <p className="text-muted-foreground text-sm">
                Organize your assets into goals and track progress. Drag and drop assets to link them.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {summary?.last_synced_at && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground font-mono mr-1">
                  <Clock className="h-3.5 w-3.5" />
                  Synced {new Date(summary.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenCreateRootGoal}
                className="gap-1.5 font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Add Goal</span>
              </Button>

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

          {/* Goals & Unassigned Assets Canvas */}
          {hasAssets ? (
            hasUnassignedAssets ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
                {/* Left Column (8 cols): Hierarchical Goals Accordions */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold tracking-tight text-foreground">
                      Goals Hierarchy
                    </h2>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleOpenCreateRootGoal}
                      className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New Goal
                    </Button>
                  </div>

                  {isGoalsLoading ? (
                    <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                      Loading goals...
                    </div>
                  ) : goals.length > 0 ? (
                    <div className="space-y-3">
                      {goals.map((goal) => (
                        <GoalAccordionItem
                          key={goal.id}
                          goal={goal}
                          allAssets={unifiedAssets}
                          onUnassignAsset={handleUnassignAsset}
                          onEditAllocation={handleEditAllocation}
                          onDeleteGoal={handleDeleteGoal}
                          onOpenCreateSubgoal={handleOpenCreateSubgoal}
                          onOpenEditGoal={handleOpenEditGoal}
                          onReorderSubgoals={handleReorderSubgoals}
                          waterfallAllocations={allWaterfallAllocations}
                          rootGoalTitle={goal.title}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 border border-dashed rounded-xl text-center space-y-3 bg-muted/20">
                      <p className="text-sm font-medium">No goals found.</p>
                      <Button size="sm" onClick={handleOpenCreateRootGoal}>
                        Create Initial Goals
                      </Button>
                    </div>
                  )}
                </div>

                {/* Right Column (4-5 cols): Sticky Unassigned Assets Panel */}
                <div className="lg:col-span-5 xl:col-span-4 sticky top-6">
                  <UnassignedAssetsPanel assets={unifiedAssets} />
                </div>
              </div>
            ) : (
              /* When all assets are assigned: Full width goals with no sidebar */
              <div className="max-w-4xl mx-auto w-full space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold tracking-tight text-foreground">
                      Goals Hierarchy
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      All assets allocated
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenCreateRootGoal}
                    className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Goal
                  </Button>
                </div>

                {isGoalsLoading ? (
                  <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    Loading goals...
                  </div>
                ) : goals.length > 0 ? (
                  <div className="space-y-3">
                    {goals.map((goal) => (
                      <GoalAccordionItem
                        key={goal.id}
                        goal={goal}
                        allAssets={unifiedAssets}
                        onUnassignAsset={handleUnassignAsset}
                        onEditAllocation={handleEditAllocation}
                        onDeleteGoal={handleDeleteGoal}
                        onOpenCreateSubgoal={handleOpenCreateSubgoal}
                        onOpenEditGoal={handleOpenEditGoal}
                        onReorderSubgoals={handleReorderSubgoals}
                        waterfallAllocations={allWaterfallAllocations}
                        rootGoalTitle={goal.title}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 border border-dashed rounded-xl text-center space-y-3 bg-muted/20">
                    <p className="text-sm font-medium">No goals found.</p>
                    <Button size="sm" onClick={handleOpenCreateRootGoal}>
                      Create Initial Goals
                    </Button>
                  </div>
                )}
              </div>
            )
          ) : !isPortfolioLoading ? (
            /* Empty state when no assets have been fetched from Kite */
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="p-4 rounded-full bg-primary/10 text-primary">
                  <Layers className="h-8 w-8" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h3 className="font-semibold text-lg">No Assets Synced Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect and fetch your equity holdings and Coin mutual funds directly from Zerodha Kite.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="gap-2 shadow-xs font-medium"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing from Kite...' : 'Sync Holdings Now'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="py-12 flex items-center justify-center text-sm text-muted-foreground gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              Loading portfolio data...
            </div>
          )}

          {/* Low-visibility summary items at the bottom */}
          {summary && hasAssets && (
            <div className="pt-6 pb-2 border-t border-border/40 mt-10 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground/75 font-mono">
              <div className="flex items-center gap-6 flex-wrap">
                <div>
                  <span className="text-muted-foreground/50 mr-1.5 uppercase tracking-wider text-[10px]">Corpus Invested:</span>
                  <span className="text-foreground/75 font-medium">{formatINR(summary.total_investment)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground/50 mr-1.5 uppercase tracking-wider text-[10px]">Overall Valuation:</span>
                  <span className="text-foreground/75 font-medium">{formatINR(summary.current_value)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground/50 mr-1.5 uppercase tracking-wider text-[10px]">Overall P&L:</span>
                  <span className={`font-medium ${summary.total_pnl >= 0 ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-rose-600/80 dark:text-rose-400/80'}`}>
                    {formatINR(summary.total_pnl)} ({formatPercent(summary.total_pnl_percentage)})
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground/50">
                {summary.equity_count} stocks • {summary.mf_count} mutual funds
              </div>
            </div>
          )}
        </main>

        {/* Drag Overlay: Renders standard floating card under cursor during drag */}
        <DragOverlay>
          {activeAsset ? (
            <div className="w-[300px]">
              <DraggableAssetItem asset={activeAsset} isOverlay />
            </div>
          ) : null}
        </DragOverlay>

        {/* Goal Create/Edit Dialog */}
        <GoalDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSubmitCreate={handleCreateGoalSubmit}
          onSubmitUpdate={handleUpdateGoalSubmit}
          parentGoal={parentGoal}
          editingGoal={editingGoal}
        />

        {/* Split Allocation Dialog */}
        <SplitAllocationDialog
          isOpen={splitDialogOpen}
          onClose={() => {
            setSplitDialogOpen(false)
            setSplitAsset(null)
            setSplitGoal(null)
          }}
          asset={splitAsset}
          goal={splitGoal}
          onConfirm={handleConfirmSplit}
        />
      </div>
    </DndContext>
  )
}
