import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Search, Layers, PieChart, Inbox, ArrowDownRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DraggableAssetItem } from './DraggableAssetItem'
import type { UnifiedAsset } from '@/types/unifiedAsset'

function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val)
}

interface UnassignedAssetsPanelProps {
  assets: UnifiedAsset[]
}

export function UnassignedAssetsPanel({ assets }: UnassignedAssetsPanelProps) {
  const [filter, setFilter] = useState<'all' | 'equity' | 'mf'>('all')
  const [search, setSearch] = useState('')

  const { isOver, setNodeRef } = useDroppable({
    id: 'unassigned',
  })

  const unassigned = assets.filter((a) => a.unallocated_percentage > 0)
  const totalValue = unassigned.reduce((sum, a) => sum + (a.current_value * a.unallocated_percentage) / 100, 0)
  const stockCount = unassigned.filter((a) => a.asset_type === 'equity').length
  const mfCount = unassigned.filter((a) => a.asset_type === 'mf').length

  const filtered = unassigned.filter((a) => {
    if (filter === 'equity' && a.asset_type !== 'equity') return false
    if (filter === 'mf' && a.asset_type !== 'mf') return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <Card
      ref={setNodeRef}
      className={`transition-all duration-200 border ${
        isOver
          ? 'ring-2 ring-primary border-primary bg-primary/5 shadow-md'
          : 'bg-card'
      }`}
    >
      <CardHeader className="pb-3 border-b">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Unassigned Assets</CardTitle>
              <Badge variant="outline" className="font-mono text-xs">
                {unassigned.length}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Holdings not yet assigned to any goal. Drag an asset into a goal on the left.
            </CardDescription>
          </div>

          <div className="text-right shrink-0">
            <div className="font-mono font-bold text-sm text-foreground">
              {formatINR(totalValue)}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Unallocated
            </div>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="space-y-2 pt-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter assets..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted/40 border rounded-md focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors ${
                filter === 'all'
                  ? 'bg-secondary text-secondary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({unassigned.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('equity')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium text-xs transition-colors ${
                filter === 'equity'
                  ? 'bg-secondary text-secondary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="w-3 h-3 text-sky-500" />
              Stocks ({stockCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('mf')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium text-xs transition-colors ${
                filter === 'mf'
                  ? 'bg-secondary text-secondary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <PieChart className="w-3 h-3 text-amber-500" />
              MFs ({mfCount})
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        {isOver && (
          <div className="mb-3 p-3 rounded-lg border-2 border-dashed border-primary bg-primary/10 text-center text-xs font-medium text-primary flex items-center justify-center gap-2">
            <ArrowDownRight className="w-4 h-4" />
            <span>Drop here to unassign asset from its goal</span>
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {filtered.map((asset) => (
              <DraggableAssetItem
                key={asset.asset_key}
                asset={asset}
                isUnassignedView
              />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
            <div className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
              <Inbox className="w-4 h-4" />
            </div>
            {unassigned.length === 0 ? (
              <p className="font-medium text-foreground">All assets have been assigned to goals!</p>
            ) : (
              <p>No unassigned assets match "{search}".</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

