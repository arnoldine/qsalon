import { useEffect, useState } from 'react'
import { Dialog } from './Dialog'
import { FormField } from './FormField'

type StockAdjustType = 'StockIn' | 'StockOut' | 'Adjustment'

interface StockAdjustDialogProps {
  open: boolean
  productName: string
  currentQty: number
  onClose: () => void
  onConfirm: (payload: { type: StockAdjustType; quantity: number; notes?: string | null }) => Promise<void>
}

export function StockAdjustDialog({ open, productName, currentQty, onClose, onConfirm }: StockAdjustDialogProps) {
  const [type, setType] = useState<StockAdjustType>('StockIn')
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setType('StockIn')
    setQuantity(1)
    setReason('')
    setError('')
  }, [open])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (quantity < 1) {
      setError('Quantity must be at least 1.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onConfirm({ type, quantity, notes: reason.trim() || null })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to adjust stock.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Adjust Stock - ${productName}`}
      size="sm"
      actions={(
        <>
          <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="stock-adjust-form" disabled={saving}>{saving ? <span className="inline-spinner" aria-label="Saving" /> : 'Confirm'}</button>
        </>
      )}
    >
      <form id="stock-adjust-form" onSubmit={submit} className="form-grid">
        <p className="hint">Current stock: {currentQty} units</p>
        <div className="reminder-channel-row">
          <label className="reminder-channel-option"><input type="radio" checked={type === 'StockIn'} onChange={() => setType('StockIn')} /> <span>Stock In</span></label>
          <label className="reminder-channel-option"><input type="radio" checked={type === 'StockOut'} onChange={() => setType('StockOut')} /> <span>Stock Out</span></label>
          <label className="reminder-channel-option"><input type="radio" checked={type === 'Adjustment'} onChange={() => setType('Adjustment')} /> <span>Adjustment</span></label>
        </div>
        <FormField label="Quantity"><input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></FormField>
        <FormField label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional" /></FormField>
        {error ? <p className="error">{error}</p> : null}
      </form>
    </Dialog>
  )
}
