import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Toast, type ToastItem, type ToastType } from '../components/Toast'

interface ToastContextState {
  showToast: (message: string, type: ToastType) => void
}

const ToastContext = createContext<ToastContextState | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const toast: ToastItem = { id, message, type }

    setToasts((prev) => [toast, ...prev].slice(0, 3))
    window.setTimeout(() => dismissToast(id), 3000)
  }, [dismissToast])

  const value = useMemo<ToastContextState>(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }

  return context
}
