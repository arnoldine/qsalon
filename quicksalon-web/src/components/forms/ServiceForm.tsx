import { useEffect, useState } from 'react'
import { Dialog } from '../Dialog'
import { FormField } from '../FormField'
import { FormFooter } from './FormFooter'

interface ServiceCategoryOption {
  id: string
  name: string
}

interface ServicePayload {
  name: string
  categoryId: string
  durationMinutes: number
  price: number
  isActive: boolean
}

interface ServiceFormProps {
  open: boolean
  mode: 'new' | 'edit'
  categories: ServiceCategoryOption[]
  initial?: Partial<ServicePayload>
  onClose: () => void
  onSave: (payload: ServicePayload) => Promise<void>
}

export function ServiceForm({ open, mode, categories, initial, onClose, onSave }: ServiceFormProps) {
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [price, setPrice] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? '')
    setCategoryId(initial?.categoryId ?? categories[0]?.id ?? '')
    setDurationMinutes(initial?.durationMinutes ?? 30)
    setPrice(initial?.price ?? 0)
    setIsActive(initial?.isActive ?? true)
    setError('')
    setShowErrors(false)
  }, [initial, categories, open])

  const missing = {
    name: !name.trim(),
    categoryId: !categoryId,
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setShowErrors(true)
    if (missing.name || missing.categoryId) return

    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), categoryId, durationMinutes, price, isActive })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save service.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeOnOverlay={false}
      title={`${mode === 'new' ? 'New' : 'Edit'} Service`}
      size="md"
      actions={<FormFooter saving={saving} saveLabel="Save" onCancel={onClose} formId="service-form" />}
    >
      <form id="service-form" onSubmit={handleSubmit} className="form-grid">
        <FormField label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className={showErrors && missing.name ? 'input-invalid' : ''} /></FormField>
        <FormField label="Category">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={showErrors && missing.categoryId ? 'input-invalid' : ''}>
            {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </FormField>
        <FormField label="Duration (minutes)"><input type="number" min={1} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} /></FormField>
        <FormField label="Price"><input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></FormField>
        <label className="checkbox-row"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /><span>Active</span></label>
        {error ? <p className="error">{error}</p> : null}
      </form>
    </Dialog>
  )
}
