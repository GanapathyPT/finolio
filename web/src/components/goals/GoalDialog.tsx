import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GoalNode, CreateGoalRequest, UpdateGoalRequest } from '@/types/goals'

interface GoalDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmitCreate: (req: CreateGoalRequest) => Promise<void>
  onSubmitUpdate?: (id: number, req: UpdateGoalRequest) => Promise<void>
  parentGoal?: GoalNode | null
  editingGoal?: GoalNode | null
}

export function GoalDialog({
  isOpen,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
  parentGoal,
  editingGoal,
}: GoalDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <GoalForm
        key={editingGoal ? `edit-${editingGoal.id}` : 'create'}
        onClose={onClose}
        onSubmitCreate={onSubmitCreate}
        onSubmitUpdate={onSubmitUpdate}
        parentGoal={parentGoal}
        editingGoal={editingGoal}
      />
    </div>
  )
}

function GoalForm({
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
  parentGoal,
  editingGoal,
}: {
  onClose: () => void
  onSubmitCreate: (req: CreateGoalRequest) => Promise<void>
  onSubmitUpdate?: (id: number, req: UpdateGoalRequest) => Promise<void>
  parentGoal?: GoalNode | null
  editingGoal?: GoalNode | null
}) {
  const [title, setTitle] = useState(editingGoal ? editingGoal.title : '')
  const [description, setDescription] = useState(editingGoal ? editingGoal.description || '' : '')
  const [targetAmount, setTargetAmount] = useState<string>(
    editingGoal && editingGoal.target_amount ? String(editingGoal.target_amount) : ''
  )
  const [targetDate, setTargetDate] = useState<string>(
    editingGoal && editingGoal.target_date ? editingGoal.target_date : ''
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = Boolean(editingGoal)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      if (isEdit && editingGoal && onSubmitUpdate) {
        await onSubmitUpdate(editingGoal.id, {
          parent_id: editingGoal.parent_id,
          title: title.trim(),
          description: description.trim(),
          target_amount: targetAmount ? parseFloat(targetAmount) : null,
          target_date: targetDate || null,
        })
      } else {
        await onSubmitCreate({
          parent_id: parentGoal ? parentGoal.id : null,
          title: title.trim(),
          description: description.trim(),
          target_amount: targetAmount ? parseFloat(targetAmount) : null,
          target_date: targetDate || null,
        })
      }
      onClose()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to save goal')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  let dialogTitle = 'Add Goal'
  if (isEdit) {
    dialogTitle = `Edit Goal "${editingGoal?.title}"`
  } else if (parentGoal) {
    dialogTitle = `Add Sub-Goal under "${parentGoal.title}"`
  }

  return (
    <div className="w-full max-w-md bg-card border rounded-xl p-6 shadow-xl space-y-4 text-foreground">
      <div className="flex items-center justify-between pb-2 border-b">
        <h2 className="text-base font-semibold text-foreground">{dialogTitle}</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-3 text-xs bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">
            Goal Title <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Safety Net, FIRE, Vacation Corpus"
            required
            className="w-full px-3 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short note or strategy for this goal..."
            rows={2}
            className="w-full px-3 py-1.5 bg-background border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Target Amount (₹)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 bg-background border rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Target Date
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 bg-background border rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Goal'}
          </Button>
        </div>
      </form>
    </div>
  )
}
