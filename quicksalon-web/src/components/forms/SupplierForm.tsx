import { useEffect, useState } from 'react'
import { Dialog } from '../Dialog'
import { FormField } from '../FormField'
import { FormFooter } from './FormFooter'

interface SupplierPayload {
  name: string
  contactPerson?: string | null
  phone?: string | null
}

interface SupplierFormProps {
  open: boolean
  mode: 'new' | 'edit'
  initial?: Partial<SupplierPayload>
  onClose: () => void
  onSave: (payload: SupplierPayload) => Promise<void>
}

export function SupplierForm({ open, mode, initial, onClose, onSave }: SupplierFormProps) {
  const [name, setName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? '')
    setContactPerson(initial?.contactPerson ?? '')
    setPhone(initial?.phone ?? '')
    setShowErrors(false)
    setError('')
  }, [initial, open])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setShowErrors(true)
    if (!name.trim()) return

    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), contactPerson: contactPerson.trim() || null, phone: phone.trim() || null })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save supplier.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} closeOnOverlay={false} title={`${mode === 'new' ? 'New' : 'Edit'} Supplier`} size="sm" actions={<FormFooter saving={saving} saveLabel="Save" onCancel={onClose} formId="supplier-form" />}>
      <form id="supplier-form" onSubmit={handleSubmit} className="form-grid">
        <FormField label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className={showErrors && !name.trim() ? 'input-invalid' : ''} /></FormField>
        <FormField label="Contact Person"><input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} /></FormField>
        <FormField label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} /></FormField>
        {error ? <p className="error">{error}</p> : null}
      </form>
    </Dialog>
  )
}
