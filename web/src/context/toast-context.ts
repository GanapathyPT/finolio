import { createContext } from 'react'

export type ToastType = 'error' | 'success' | 'warning' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  title?: string
  duration?: number
}

export interface ToastContextValue {
  showToast: (options: {
    type?: ToastType
    message: string
    title?: string
    duration?: number
  }) => void
  error: (message: string, title?: string, duration?: number) => void
  success: (message: string, title?: string, duration?: number) => void
  warning: (message: string, title?: string, duration?: number) => void
  info: (message: string, title?: string, duration?: number) => void
  dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
