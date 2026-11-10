import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react'
import { ToastContext, type ToastItem, type ToastType } from './toast-context'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [portalElement] = useState<HTMLElement | null>(() => {
    if (typeof document !== 'undefined') {
      return document.getElementById('toast-root') || document.body
    }
    return null
  })
  const timerMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    const timerMap = timerMapRef.current
    return () => {
      timerMap.forEach((t) => clearTimeout(t))
      timerMap.clear()
    }
  }, [])

  const dismiss = useCallback((id: string) => {
    const existingTimer = timerMapRef.current.get(id)
    if (existingTimer) {
      clearTimeout(existingTimer)
      timerMapRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    ({
      type = 'info',
      message,
      title,
      duration = 5000,
    }: {
      type?: ToastType
      message: string
      title?: string
      duration?: number
    }) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      const item: ToastItem = { id, type, message, title, duration }

      setToasts((prev) => [...prev, item])

      if (duration > 0) {
        const timer = setTimeout(() => {
          dismiss(id)
        }, duration)
        timerMapRef.current.set(id, timer)
      }
    },
    [dismiss]
  )

  const error = useCallback(
    (message: string, title = 'Error', duration = 5000) => {
      showToast({ type: 'error', message, title, duration })
    },
    [showToast]
  )

  const success = useCallback(
    (message: string, title = 'Success', duration = 4000) => {
      showToast({ type: 'success', message, title, duration })
    },
    [showToast]
  )

  const warning = useCallback(
    (message: string, title = 'Warning', duration = 5000) => {
      showToast({ type: 'warning', message, title, duration })
    },
    [showToast]
  )

  const info = useCallback(
    (message: string, title = 'Info', duration = 4000) => {
      showToast({ type: 'info', message, title, duration })
    },
    [showToast]
  )

  const toastIcons: Record<ToastType, ReactNode> = {
    error: <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
    info: <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />,
  }

  const toastBorders: Record<ToastType, string> = {
    error: 'border-destructive/30 bg-card/95 text-foreground ring-1 ring-destructive/20 shadow-destructive/10',
    success: 'border-emerald-500/30 bg-card/95 text-foreground ring-1 ring-emerald-500/20 shadow-emerald-500/10',
    warning: 'border-amber-500/30 bg-card/95 text-foreground ring-1 ring-amber-500/20 shadow-amber-500/10',
    info: 'border-sky-500/30 bg-card/95 text-foreground ring-1 ring-sky-500/20 shadow-sky-500/10',
  }

  return (
    <ToastContext.Provider value={{ showToast, error, success, warning, info, dismiss }}>
      {children}
      {portalElement &&
        createPortal(
          <div
            className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] sm:w-96 pointer-events-none"
            aria-live="assertive"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                role="alert"
                className={`pointer-events-auto rounded-xl border p-3.5 shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-top-3 fade-in ${toastBorders[t.type]}`}
              >
                {toastIcons[t.type]}
                <div className="flex-1 min-w-0 space-y-0.5">
                  {t.title && (
                    <div className="font-semibold text-xs tracking-wide text-foreground">
                      {t.title}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground leading-relaxed break-words font-mono">
                    {t.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="p-1 -mr-1 -mt-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>,
          portalElement
        )}
    </ToastContext.Provider>
  )
}
