import { useEffect } from 'react'
import { useFocusTrap } from './useFocusTrap'

interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  actions?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'danger'
  closeOnOverlay?: boolean
}

export function Dialog({
  open,
  title,
  onClose,
  children,
  actions,
  size = 'md',
  variant = 'default',
  closeOnOverlay = true,
}: DialogProps) {
  const ref = useFocusTrap<HTMLDivElement>(open, onClose)

  useEffect(() => {
    if (!open) {
      return
    }

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) {
    return null
  }

  return (
    <div className="modal-overlay" onClick={closeOnOverlay ? onClose : undefined}>
      <div
        ref={ref}
        className={`dialog-card dialog-${size} dialog-${variant}`}
        onClick={(event) => event.stopPropagation()}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className={`dialog-header${variant === 'danger' ? ' danger' : ''}`}>
          <h3>{title}</h3>
          <button type="button" className="icon-close-button" onClick={onClose} aria-label="Close dialog">×</button>
        </header>

        <div className="dialog-body">{children}</div>

        {actions ? <footer className="dialog-footer">{actions}</footer> : null}
      </div>
    </div>
  )
}
