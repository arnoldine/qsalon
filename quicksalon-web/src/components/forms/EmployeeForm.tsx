import { useEffect, useState } from 'react'
import { Dialog } from '../Dialog'
import { FormField } from '../FormField'
import { FormFooter } from './FormFooter'

interface EmployeePayload {
  name: string
  role: string
  phone?: string | null
  commissionRate: number
  status: string
}

interface EmployeeFormProps {
  open: boolean
  mode: 'new' | 'edit'
  initial?: Partial<EmployeePayload>
  onClose: () => void
  onSave: (payload: EmployeePayload) => Promise<void>
}

export function EmployeeForm({ open, mode, initial, onClose, onSave }: EmployeeFormProps) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('Stylist')
  const [phone, setPhone] = useState('')
  const [commissionRate, setCommissionRate] = useState(10)
  const [status, setStatus] = useState('Active')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? '')
    setRole(initial?.role ?? 'Stylist')
    setPhone(initial?.phone ?? '')
    setCommissionRate(initial?.commissionRate ?? 10)
    setStatus(initial?.status ?? 'Active')
    setError('')
    setShowErrors(false)
  }, [initial, open])

  const missing = {
    name: !name.trim(),
    role: !role.trim(),
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setShowErrors(true)
    if (missing.name || missing.role) return

    setSaving(true)
    setError('')
    try {
      await onSave({
        name: name.trim(),
        role: role.trim(),
        phone: phone.trim() || null,
        commissionRate,
        status,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save employee.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      closeOnOverlay={false}
      title={`${mode === 'new' ? 'New' : 'Edit'} Employee`}
      size="md"
      actions={<FormFooter saving={saving} saveLabel="Save" onCancel={onClose} formId="employee-form" />}
    >
      <form id="employee-form" onSubmit={handleSubmit} className="form-grid">
        <FormField label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className={showErrors && missing.name ? 'input-invalid' : ''} /></FormField>
        <FormField label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value)} className={showErrors && missing.role ? 'input-invalid' : ''}>
            <option value="">— Select Role —</option>
            {['Stylist','Beautician','Receptionist','Cashier','InventoryOfficer','BranchManager','SalonOwner','Admin'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </FormField>
        <FormField label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} /></FormField>
        <FormField label="Commission Rate %"><input type="number" value={commissionRate} onChange={(e) => setCommissionRate(Number(e.target.value))} /></FormField>
        <FormField label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="OnLeave">OnLeave</option>
          </select>
        </FormField>
        {error ? <p className="error">{error}</p> : null}
      </form>
    </Dialog>
  )
}
