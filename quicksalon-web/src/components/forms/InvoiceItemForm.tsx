import { useEffect, useState } from 'react'
import { Dialog } from '../Dialog'
import { FormField } from '../FormField'
import { FormFooter } from './FormFooter'
import { formatMoney } from '../../lib/money'

interface InvoiceItemPayload {
  itemType: 'Service' | 'Product'
  itemId: string
  description: string
  quantity: number
  unitPrice: number
}

interface ItemOption {
  id: string
  name: string
  price: number
  type: 'Service' | 'Product'
}

interface InvoiceItemFormProps {
  open: boolean
  options: ItemOption[]
  onClose: () => void
  onSave: (payload: InvoiceItemPayload) => Promise<void>
}

export function InvoiceItemForm({ open, options, onClose, onSave }: InvoiceItemFormProps) {
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [saving, setSaving] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [error, setError] = useState('')

  const selected = options.find((option) => option.id === itemId)

  useEffect(() => {
    if (!open) return
    setItemId(options[0]?.id ?? '')
    setQuantity(1)
    setShowErrors(false)
    setError('')
  }, [open, options])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setShowErrors(true)
    if (!selected) return

    setSaving(true)
    setError('')
    try {
      await onSave({ itemType: selected.type, itemId: selected.id, description: selected.name, quantity, unitPrice: selected.price })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to add invoice item.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} closeOnOverlay={false} title="New Invoice Item" size="sm" actions={<FormFooter saving={saving} saveLabel="Save" onCancel={onClose} formId="invoice-item-form" />}>
      <form id="invoice-item-form" onSubmit={handleSubmit} className="form-grid">
        <FormField label="Item">
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={showErrors && !itemId ? 'input-invalid' : ''}>
            {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </FormField>
        <FormField label="Quantity"><input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></FormField>
        {selected ? <p className="hint">Unit price: {formatMoney(selected.price)}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </form>
    </Dialog>
  )
}
