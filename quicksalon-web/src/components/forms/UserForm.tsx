import { useEffect, useMemo, useState } from 'react'
import { Dialog } from '../Dialog'
import { FormField } from '../FormField'
import { FormFooter } from './FormFooter'

interface TenantOption { id: string; name: string }
interface BranchOption { id: string; name: string; tenantId: string }

interface UserPayload {
  tenantId: string
  branchId: string
  fullName: string
  username: string
  email?: string | null
  isActive: boolean
  role: string
  password?: string | null
}

interface UserFormProps {
  open: boolean
  mode: 'new' | 'edit'
  tenants: TenantOption[]
  branches: BranchOption[]
  roles: string[]
  initial?: Partial<UserPayload>
  onClose: () => void
  onSave: (payload: UserPayload) => Promise<void>
}

export function UserForm({ open, mode, tenants, branches, roles, initial, onClose, onSave }: UserFormProps) {
  const [tenantId, setTenantId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [role, setRole] = useState('Receptionist')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [error, setError] = useState('')

  const availableBranches = useMemo(() => branches.filter((item) => item.tenantId === tenantId), [branches, tenantId])

  useEffect(() => {
    if (!open) return
    const nextTenant = initial?.tenantId ?? tenants[0]?.id ?? ''
    const nextBranch = initial?.branchId ?? branches.find((item) => item.tenantId === nextTenant)?.id ?? ''
    setTenantId(nextTenant)
    setBranchId(nextBranch)
    setFullName(initial?.fullName ?? '')
    setUsername(initial?.username ?? '')
    setEmail(initial?.email ?? '')
    setIsActive(initial?.isActive ?? true)
    setRole(initial?.role ?? 'Receptionist')
    setPassword('')
    setShowErrors(false)
    setError('')
  }, [open, initial, tenants, branches])

  useEffect(() => {
    if (availableBranches.some((item) => item.id === branchId)) {
      return
    }
    setBranchId(availableBranches[0]?.id ?? '')
  }, [availableBranches, branchId])

  const missing = {
    tenantId: !tenantId,
    branchId: !branchId,
    fullName: !fullName.trim(),
    username: !username.trim(),
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setShowErrors(true)
    if (missing.tenantId || missing.branchId || missing.fullName || missing.username) return

    setSaving(true)
    setError('')
    try {
      await onSave({ tenantId, branchId, fullName: fullName.trim(), username: username.trim(), email: email.trim() || null, isActive, role, password: password || null })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save user.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} closeOnOverlay={false} title={`${mode === 'new' ? 'New' : 'Edit'} User`} size="md" actions={<FormFooter saving={saving} saveLabel="Save" onCancel={onClose} formId="user-form" />}>
      <form id="user-form" onSubmit={handleSubmit} className="form-grid">
        <FormField label="Tenant"><select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className={showErrors && missing.tenantId ? 'input-invalid' : ''}>{tenants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField>
        <FormField label="Branch"><select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={showErrors && missing.branchId ? 'input-invalid' : ''}>{availableBranches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField>
        <FormField label="Full Name"><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={showErrors && missing.fullName ? 'input-invalid' : ''} /></FormField>
        <FormField label="Username"><input value={username} onChange={(e) => setUsername(e.target.value)} className={showErrors && missing.username ? 'input-invalid' : ''} /></FormField>
        <FormField label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></FormField>
        <FormField label="Role"><select value={role} onChange={(e) => setRole(e.target.value)}>{roles.map((item) => <option key={item} value={item}>{item}</option>)}</select></FormField>
        <FormField label={mode === 'new' ? 'Password (optional)' : 'New Password (optional)'}><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></FormField>
        <label className="checkbox-row"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /><span>Active</span></label>
        {error ? <p className="error">{error}</p> : null}
      </form>
    </Dialog>
  )
}
