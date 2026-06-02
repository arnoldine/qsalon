import { useEffect, useState } from 'react'
import { Dialog } from '../Dialog'
import { FormField } from '../FormField'
import { FormFooter } from './FormFooter'

interface CustomerPayload {
  firstName: string
  lastName: string
  phone: string
  email?: string | null
  loyaltyPoints: number
}

interface CustomerFormProps {
  open: boolean
  mode: 'new' | 'edit'
  initial?: Partial<CustomerPayload>
  onClose: () => void
  onSave: (payload: CustomerPayload) => Promise<void>
}

export function CustomerForm({ open, mode, initial, onClose, onSave }: CustomerFormProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    if (!open) return
    setFirstName(initial?.firstName ?? '')
    setLastName(initial?.lastName ?? '')
    setPhone(initial?.phone ?? '')
    setEmail(initial?.email ?? '')
    setLoyaltyPoints(initial?.loyaltyPoints ?? 0)
    setError('')
    setShowErrors(false)
  }, [initial, open])

  const missing = {
    firstName: !firstName.trim(),
    lastName: !lastName.trim(),
    phone: !phone.trim(),
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setShowErrors(true)
    if (missing.firstName || missing.lastName || missing.phone) {
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        loyaltyPoints,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save customer.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeOnOverlay={false}
      title={`${mode === 'new' ? 'New' : 'Edit'} Customer`}
      size="md"
      actions={<FormFooter saving={saving} saveLabel="Save" onCancel={onClose} formId="customer-form" />}
    >
      <form id="customer-form" onSubmit={handleSubmit} className="form-grid">
        <FormField label="First Name"><input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={showErrors && missing.firstName ? 'input-invalid' : ''} /></FormField>
        <FormField label="Last Name"><input value={lastName} onChange={(e) => setLastName(e.target.value)} className={showErrors && missing.lastName ? 'input-invalid' : ''} /></FormField>
        <FormField label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={showErrors && missing.phone ? 'input-invalid' : ''} /></FormField>
        <FormField label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} /></FormField>
        <FormField label="Loyalty Points"><input type="number" value={loyaltyPoints} onChange={(e) => setLoyaltyPoints(Number(e.target.value))} /></FormField>
        {error ? <p className="error">{error}</p> : null}
      </form>
    </Dialog>
  )
}
