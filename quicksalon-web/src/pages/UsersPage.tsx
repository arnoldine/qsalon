import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { UserForm } from '../components/forms/UserForm'
import { PageHeader } from '../components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import type { BranchAdminItem, TenantAdminItem, UserAdminItem } from '../types'

const roleOptions = ['Admin', 'SystemAdmin', 'SalonOwner', 'BranchManager', 'Receptionist', 'Cashier', 'InventoryOfficer', 'Stylist', 'Beautician']

const initialForm = {
  tenantId: '',
  branchId: '',
  fullName: '',
  username: '',
  email: '',
  isActive: true,
  role: 'Receptionist',
  password: '',
}

export function UsersPage() {
  const { showToast } = useToast()
  const [items, setItems] = useState<UserAdminItem[]>([])
  const [tenants, setTenants] = useState<TenantAdminItem[]>([])
  const [branches, setBranches] = useState<BranchAdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState(false)
  const [q, setQ] = useState('')
  const [tenantFilter, setTenantFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<UserAdminItem | null>(null)
  const [form, setForm] = useState(initialForm)

  function getApiErrorMessage(e: unknown, fallback: string) {
    if (!(e instanceof Error) || !e.message) {
      return fallback
    }

    try {
      const parsed = JSON.parse(e.message) as { message?: string }
      if (parsed.message) {
        return parsed.message
      }
    } catch {
      // Keep original error message when it is not JSON.
    }

    return e.message
  }

  const availableBranches = useMemo(
    () => branches.filter((b) => !form.tenantId || b.tenantId === form.tenantId),
    [branches, form.tenantId],
  )

  async function loadBaseData() {
    const [tenantData, branchData] = await Promise.all([
      api<TenantAdminItem[]>('/api/superadmin/tenants'),
      api<BranchAdminItem[]>('/api/superadmin/branches'),
    ])

    setTenants(tenantData)
    setBranches(branchData)

    const defaultTenant = tenantData[0]?.id ?? ''
    const defaultBranch = branchData.find((b) => b.tenantId === defaultTenant)?.id ?? ''
    setForm((x) => ({
      ...x,
      tenantId: x.tenantId || defaultTenant,
      branchId: x.branchId || defaultBranch,
    }))
  }

  async function loadUsers() {
    setLoading(true)
    setError('')
    setActionMessage('')

    try {
      const query = new URLSearchParams()
      if (q) query.set('q', q)
      if (tenantFilter) query.set('tenantId', tenantFilter)
      const result = await api<UserAdminItem[]>(`/api/superadmin/users?${query.toString()}`)
      setItems(result)
      showToast('Users loaded.', 'info')
    } catch {
      setError('Unable to load users.')
      showToast('Unable to load users.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBaseData().then(loadUsers).catch(() => {
      setError('Unable to load user management data.')
      showToast('Unable to load user management data.', 'error')
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!form.tenantId) return

    const firstBranch = branches.find((b) => b.tenantId === form.tenantId)
    if (!firstBranch) return

    if (!availableBranches.some((b) => b.id === form.branchId)) {
      setForm((x) => ({ ...x, branchId: firstBranch.id }))
    }
  }, [branches, availableBranches, form.branchId, form.tenantId])

  function startEdit(item: UserAdminItem) {
    setActionMessage('')
    setEditingId(item.id)
    setForm({
      tenantId: item.tenantId,
      branchId: item.branchId,
      fullName: item.fullName,
      username: item.username,
      email: item.email ?? '',
      isActive: item.isActive,
      role: item.role || 'Receptionist',
      password: '',
    })
  }

  function resetForm() {
    setActionMessage('')
    setEditingId('')
    setForm((x) => ({ ...initialForm, tenantId: x.tenantId, branchId: x.branchId }))
  }

  async function toggleActive(item: UserAdminItem) {
    setActionMessage('')
    try {
      await api(`/api/superadmin/users/${item.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !item.isActive }),
      })
      await loadUsers()
      setActionError(false)
      setActionMessage(`User \"${item.username}\" ${item.isActive ? 'deactivated' : 'activated'}.`)
      showToast(`User ${item.isActive ? 'deactivated' : 'activated'}.`, 'success')
    } catch (e) {
      setActionError(true)
      setActionMessage(getApiErrorMessage(e, 'Unable to update user status.'))
      showToast('Unable to update user status.', 'error')
    }
  }

  async function deleteUser() {
    if (!pendingDelete) return
    try {
      await api(`/api/superadmin/users/${pendingDelete.id}`, { method: 'DELETE' })
      setConfirmOpen(false)
      setPendingDelete(null)
      await loadUsers()
      showToast('User deleted successfully.', 'success')
    } catch {
      showToast('Unable to delete user.', 'error')
    }
  }

  return (
    <section>
      <PageHeader title="User Management" subtitle="Provision and maintain branch users and role assignment" actions={<button type="button" onClick={() => { resetForm(); setFormOpen(true) }}>New User</button>} />

      <div className="toolbar">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, username, email" />
        <select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)}>
          <option value="">All tenants</option>
          {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button onClick={loadUsers}>Search</button>
      </div>

      <UserForm
        open={formOpen}
        mode={editingId ? 'edit' : 'new'}
        tenants={tenants.map((item) => ({ id: item.id, name: item.name }))}
        branches={branches.map((item) => ({ id: item.id, name: item.name, tenantId: item.tenantId }))}
        roles={roleOptions}
        initial={form}
        onClose={() => setFormOpen(false)}
        onSave={async (payload) => {
          setForm({
            tenantId: payload.tenantId,
            branchId: payload.branchId,
            fullName: payload.fullName,
            username: payload.username,
            email: payload.email ?? '',
            isActive: payload.isActive,
            role: payload.role,
            password: payload.password ?? '',
          })
          if (editingId) {
            await api(`/api/superadmin/users/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
          } else {
            await api('/api/superadmin/users', { method: 'POST', body: JSON.stringify(payload) })
          }
          setEditingId('')
          await loadUsers()
          showToast(editingId ? 'User updated successfully.' : 'User created successfully.', 'success')
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete User?"
        message="This action is permanent and cannot be undone."
        confirmLabel="Delete User"
        cancelLabel="Keep User"
        variant="danger"
        onClose={() => setConfirmOpen(false)}
        onConfirm={deleteUser}
      />

      {loading ? <LoadingState message="Loading users..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && actionMessage ? (
        <p className={actionError ? 'error' : 'hint'}>{actionMessage}</p>
      ) : null}
      {!loading && !error && items.length === 0 ? <EmptyState title="No users found" description="Create your first user from the form above." /> : null}
      {!loading && !error && items.length > 0 ? (
        <>
          <DataTable
            headers={['Tenant', 'Branch', 'Name', 'Username', 'Role', 'Active']}
            rows={items.map((x) => [x.tenantName, x.branchName, x.fullName, x.username, x.role || '-', x.isActive ? 'Yes' : 'No'])}
          />
          <div className="toolbar">
            {items.map((x) => (
              <div key={x.id} className="toolbar">
                <button type="button" onClick={() => startEdit(x)}>Edit {x.username}</button>
                <button type="button" onClick={() => toggleActive(x)}>{x.isActive ? 'Deactivate' : 'Activate'} {x.username}</button>
                <button type="button" className="danger-button" onClick={() => { setPendingDelete(x); setConfirmOpen(true) }}>Delete {x.username}</button>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}
