import { AlertTriangle } from 'lucide-react'
import { Dialog } from './Dialog'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void | Promise<void>
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      variant={variant}
      size="sm"
      actions={(
        <>
          <button type="button" className="secondary-button" onClick={onClose}>{cancelLabel}</button>
          <button type="button" className={variant === 'danger' ? 'danger-button icon-button' : 'icon-button'} onClick={() => void onConfirm()}>
            {variant === 'danger' ? <AlertTriangle size={16} /> : null}
            {confirmLabel}
          </button>
        </>
      )}
    >
      <p>{message}</p>
    </Dialog>
  )
}
