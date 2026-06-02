import { useEffect, useState } from 'react'
import { Dialog } from '../Dialog'
import { FormField } from '../FormField'
import { FormFooter } from './FormFooter'

interface TenantOption { id: string; name: string }

interface BranchPayload {
  tenantId: string
  name: string
  address?: string | null
  phone?: string | null
}

interface BranchFormProps {
  open: boolean
  mode: 'new' | 'edit'
  tenants: TenantOption[]
  initial?: Partial<BranchPayload>
  onClose: () => void
  onSave: (payload: BranchPayload) => Promise<void>
}

export function BranchForm({ open, mode, tenants, initial, onClose, onSave }: BranchFormProps) {
  const [tenantId, setTenantId] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setTenantId(initial?.tenantId ?? tenants[0]?.id ?? '')
    setName(initial?.name ?? '')
    setAddress(initial?.address ?? '')
    setPhone(initial?.phone ?? '')
    setShowErrors(false)
    setError('')
  }, [open, initial, tenants])

  const missing = {
    tenantId: !tenantId,
    name: !name.trim(),
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setShowErrors(true)
    if (missing.tenantId || missing.name) return

    setSaving(true)
    setError('')
    try {
      await onSave({ tenantId, name: name.trim(), address: address.trim() || null, phone: phone.trim() || null })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save branch.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} closeOnOverlay={false} title={`${mode === 'new' ? 'New' : 'Edit'} Branch`} size="md" actions={<FormFooter saving={saving} saveLabel="Save" onCancel={onClose} formId="branch-form" />}>
      <form id="branch-form" onSubmit={handleSubmit} className="form-grid">
        <FormField label="Tenant"><select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className={showErrors && missing.tenantId ? 'input-invalid' : ''}>{tenants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField>
        <FormField label="Branch Name"><input value={name} onChange={(e) => setName(e.target.value)} className={showErrors && missing.name ? 'input-invalid' : ''} /></FormField>
        <FormField label="Address"><input value={address} onChange={(e) => setAddress(e.target.value)} /></FormField>
        <FormField label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} /></FormField>
        {error ? <p className="error">{error}</p> : null}
      </form>
    </Dialog>
  )
}
