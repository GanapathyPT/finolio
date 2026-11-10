import { useState } from 'react'
import { X, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GoalNode, CreateGoalRequest, UpdateGoalRequest } from '@/types/goals'

const CURRENT_YEAR = new Date().getFullYear()

type DatePrecision = 'year' | 'month' | 'date'

function detectDatePrecision(dateStr?: string | null): DatePrecision {
  if (!dateStr) return 'year'
  const trimmed = dateStr.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return 'date'
  if (/^\d{4}-\d{2}$/.test(trimmed)) return 'month'
  return 'year'
}

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
  const currentYear = CURRENT_YEAR
  const isEdit = Boolean(editingGoal)

  const [title, setTitle] = useState(editingGoal ? editingGoal.title : '')
  const [description, setDescription] = useState(editingGoal ? editingGoal.description || '' : '')
  const [targetAmount, setTargetAmount] = useState<string>(
    editingGoal && editingGoal.target_amount ? String(editingGoal.target_amount) : ''
  )

  const initialPrecision = detectDatePrecision(editingGoal?.target_date)
  const [precision, setPrecision] = useState<DatePrecision>(initialPrecision)
  const [targetDate, setTargetDate] = useState<string>(
    editingGoal && editingGoal.target_date ? editingGoal.target_date : ''
  )
  const [yearVal, setYearVal] = useState<string>(() => {
    if (editingGoal?.target_date && /^\d{4}/.test(editingGoal.target_date)) {
      return editingGoal.target_date.slice(0, 4)
    }
    return ''
  })
  const [monthVal, setMonthVal] = useState<string>(() => {
    if (editingGoal?.target_date && /^\d{4}-\d{2}/.test(editingGoal.target_date)) {
      return editingGoal.target_date.slice(0, 7)
    }
    return ''
  })
  const [dateVal, setDateVal] = useState<string>(() => {
    if (editingGoal?.target_date && /^\d{4}-\d{2}-\d{2}/.test(editingGoal.target_date)) {
      return editingGoal.target_date.slice(0, 10)
    }
    return ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePrecisionChange = (p: DatePrecision) => {
    setPrecision(p)
    if (p === 'year') {
      const yr = yearVal || (targetDate && /^\d{4}/.test(targetDate) ? targetDate.slice(0, 4) : '')
      setYearVal(yr)
      setTargetDate(yr)
    } else if (p === 'month') {
      const mo =
        monthVal ||
        (targetDate && /^\d{4}-\d{2}/.test(targetDate)
          ? targetDate.slice(0, 7)
          : yearVal
          ? `${yearVal}-01`
          : '')
      setMonthVal(mo)
      setTargetDate(mo)
    } else {
      const dt =
        dateVal ||
        (targetDate && /^\d{4}-\d{2}-\d{2}/.test(targetDate)
          ? targetDate.slice(0, 10)
          : monthVal
          ? `${monthVal}-01`
          : '')
      setDateVal(dt)
      setTargetDate(dt)
    }
  }

  const handleYearChange = (val: string) => {
    setYearVal(val)
    setTargetDate(val ? val.trim() : '')
  }

  const handleMonthChange = (val: string) => {
    setMonthVal(val)
    setTargetDate(val ? val.trim() : '')
  }

  const handleDateChange = (val: string) => {
    setDateVal(val)
    setTargetDate(val ? val.trim() : '')
  }

  const handleClearDate = () => {
    setTargetDate('')
    setYearVal('')
    setMonthVal('')
    setDateVal('')
  }

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

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Target Amount (₹, Optional)
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="e.g. 500000 (leave empty for open-ended wealth pool)"
            className="w-full px-3 py-2 bg-background border rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Target Date Section with Granularity Mode */}
        <div className="space-y-2 p-3 rounded-lg border bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Target Horizon / Date (Optional)</span>
            </div>
            {targetDate && (
              <button
                type="button"
                onClick={handleClearDate}
                className="text-[11px] text-muted-foreground hover:text-foreground font-medium underline-offset-2 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          {/* Granularity Pills: Year Only / Month + Year / Exact Date */}
          <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted/60 border border-border/50 text-[11px]">
            <button
              type="button"
              onClick={() => handlePrecisionChange('year')}
              className={`flex-1 py-1 px-2 rounded font-medium transition-colors text-center ${
                precision === 'year'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Year
            </button>
            <button
              type="button"
              onClick={() => handlePrecisionChange('month')}
              className={`flex-1 py-1 px-2 rounded font-medium transition-colors text-center ${
                precision === 'month'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Month + Year
            </button>
            <button
              type="button"
              onClick={() => handlePrecisionChange('date')}
              className={`flex-1 py-1 px-2 rounded font-medium transition-colors text-center ${
                precision === 'date'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Exact Date
            </button>
          </div>

          {/* Input based on granularity */}
          {precision === 'year' && (
            <div className="space-y-2 pt-0.5">
              <input
                type="number"
                min="2024"
                max="2100"
                placeholder="e.g. 2030"
                value={yearVal}
                onChange={(e) => handleYearChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex items-center gap-1 flex-wrap text-[11px] font-mono text-muted-foreground">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground/70 mr-1">Quick:</span>
                {[1, 3, 5, 10, 15, 20].map((offset) => {
                  const yr = String(currentYear + offset)
                  return (
                    <button
                      key={offset}
                      type="button"
                      onClick={() => handleYearChange(yr)}
                      className={`px-1.5 py-0.5 rounded border text-[10px] transition-colors ${
                        yearVal === yr
                          ? 'bg-primary/10 text-primary border-primary/30 font-semibold'
                          : 'border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      +{offset}y ({yr})
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {precision === 'month' && (
            <div className="pt-0.5">
              <input
                type="month"
                value={monthVal}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {precision === 'date' && (
            <div className="pt-0.5">
              <input
                type="date"
                value={dateVal}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-background border rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
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
