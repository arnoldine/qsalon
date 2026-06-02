import { useEffect, useState } from 'react'
import { Dialog } from '../Dialog'
import { FormField } from '../FormField'
import { FormFooter } from './FormFooter'

interface TenantPayload {
  name: string
  slug: string
  contactEmail?: string | null
  phone?: string | null
  address?: string | null
  isActive: boolean
}

interface TenantFormProps {
  open: boolean
  mode: 'new' | 'edit'
  initial?: Partial<TenantPayload>
  onClose: () => void
  onSave: (payload: TenantPayload) => Promise<void>
}

export function TenantForm({ open, mode, initial, onClose, onSave }: TenantFormProps) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? '')
    setSlug(initial?.slug ?? '')
    setContactEmail(initial?.contactEmail ?? '')
    setPhone(initial?.phone ?? '')
    setAddress(initial?.address ?? '')
    setIsActive(initial?.isActive ?? true)
    setShowErrors(false)
    setError('')
  }, [open, initial])

  const missing = {
    name: !name.trim(),
    slug: !slug.trim(),
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setShowErrors(true)
    if (missing.name || missing.slug) return

    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), slug: slug.trim().toLowerCase(), contactEmail: contactEmail.trim() || null, phone: phone.trim() || null, address: address.trim() || null, isActive })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save tenant.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} closeOnOverlay={false} title={`${mode === 'new' ? 'New' : 'Edit'} Tenant`} size="md" actions={<FormFooter saving={saving} saveLabel="Save" onCancel={onClose} formId="tenant-form" />}>
      <form id="tenant-form" onSubmit={handleSubmit} className="form-grid">
        <FormField label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className={showErrors && missing.name ? 'input-invalid' : ''} /></FormField>
        <FormField label="Slug"><input value={slug} onChange={(e) => setSlug(e.target.value)} className={showErrors && missing.slug ? 'input-invalid' : ''} /></FormField>
        <FormField label="Contact Email"><input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></FormField>
        <FormField label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} /></FormField>
        <FormField label="Address"><input value={address} onChange={(e) => setAddress(e.target.value)} /></FormField>
        <label className="checkbox-row"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /><span>Active</span></label>
        {error ? <p className="error">{error}</p> : null}
      </form>
    </Dialog>
  )
}
