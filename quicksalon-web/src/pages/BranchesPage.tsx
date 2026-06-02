import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { BranchForm } from '../components/forms/BranchForm'
import { FormField } from '../components/FormField'
import { PageHeader } from '../components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import type { BranchAdminItem, TenantAdminItem } from '../types'

const initialForm = {
  tenantId: '',
  name: '',
  address: '',
  phone: '',
}

export function BranchesPage() {
  const { showToast } = useToast()
  const [items, setItems] = useState<BranchAdminItem[]>([])
  const [tenants, setTenants] = useState<TenantAdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState(false)
  const [q, setQ] = useState('')
  const [tenantFilter, setTenantFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<BranchAdminItem | null>(null)
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

  async function loadTenants() {
    try {
      const result = await api<TenantAdminItem[]>('/api/superadmin/tenants')
      setTenants(result)
      if (!form.tenantId && result.length > 0) {
        setForm((x) => ({ ...x, tenantId: result[0].id }))
      }
    } catch {
      showToast('Unable to load tenants.', 'error')
      throw new Error('Unable to load tenants.')
    }
  }

  async function loadBranches() {
    setLoading(true)
    setError('')
    setActionMessage('')
    try {
      const query = new URLSearchParams()
      if (q) query.set('q', q)
      if (tenantFilter) query.set('tenantId', tenantFilter)
      const result = await api<BranchAdminItem[]>(`/api/superadmin/branches?${query.toString()}`)
      setItems(result)
      showToast('Branches loaded.', 'info')
    } catch {
      setError('Unable to load branches.')
      showToast('Unable to load branches.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTenants().then(loadBranches).catch(() => {
      setError('Unable to load branch management data.')
      showToast('Unable to load branch management data.', 'error')
      setLoading(false)
    })
  }, [])

  function startEdit(item: BranchAdminItem) {
    setActionMessage('')
    setEditingId(item.id)
    setForm({
      tenantId: item.tenantId,
      name: item.name,
      address: item.address ?? '',
      phone: item.phone ?? '',
    })
  }

  async function removeBranch(item: BranchAdminItem) {
    setActionMessage('')

    try {
      await api(`/api/superadmin/branches/${item.id}`, {
        method: 'DELETE',
      })
      await loadBranches()
      setActionError(false)
      setActionMessage(`Branch \"${item.name}\" deleted.`)
      showToast('Branch deleted successfully.', 'success')
    } catch (e) {
      setActionError(true)
      setActionMessage(getApiErrorMessage(e, 'Unable to delete branch.'))
      showToast('Unable to delete branch.', 'error')
    }
  }

  return (
    <section>
      <PageHeader title="Branch Management" subtitle="Manage branch records across tenants" actions={<button type="button" onClick={() => { setEditingId(''); setFormOpen(true) }}>New Branch</button>} />

      <div className="toolbar">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search branch name or address" />
        <select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)}>
          <option value="">All tenants</option>
          {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button onClick={loadBranches}>Search</button>
      </div>

      <div className="panel form-grid">
        <FormField label="Tenant">
          <select value={form.tenantId} onChange={(e) => setForm((x) => ({ ...x, tenantId: e.target.value }))}>
            {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </FormField>
        <button type="button" onClick={() => setFormOpen(true)}>{editingId ? 'Continue Editing Form' : 'Open Branch Form'}</button>
      </div>

      <BranchForm
        open={formOpen}
        mode={editingId ? 'edit' : 'new'}
        tenants={tenants.map((item) => ({ id: item.id, name: item.name }))}
        initial={{ tenantId: form.tenantId, name: form.name, address: form.address, phone: form.phone }}
        onClose={() => setFormOpen(false)}
        onSave={async (payload) => {
          setForm({ tenantId: payload.tenantId, name: payload.name, address: payload.address ?? '', phone: payload.phone ?? '' })
          if (editingId) {
            await api(`/api/superadmin/branches/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
          } else {
            await api('/api/superadmin/branches', { method: 'POST', body: JSON.stringify(payload) })
          }
          setEditingId('')
          await loadBranches()
          showToast(editingId ? 'Branch updated successfully.' : 'Branch created successfully.', 'success')
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Branch?"
        message={`Delete branch \"${pendingDelete?.name || ''}\"? This cannot be undone.`}
        confirmLabel="Delete Branch"
        cancelLabel="Keep Branch"
        variant="danger"
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          if (pendingDelete) {
            await removeBranch(pendingDelete)
            setConfirmOpen(false)
            setPendingDelete(null)
          }
        }}
      />

      {loading ? <LoadingState message="Loading branches..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && actionMessage ? (
        <p className={actionError ? 'error' : 'hint'}>{actionMessage}</p>
      ) : null}
      {!loading && !error && items.length === 0 ? <EmptyState title="No branches found" description="Create your first branch from the form above." /> : null}
      {!loading && !error && items.length > 0 ? (
        <>
          <DataTable
            headers={['Tenant', 'Branch', 'Address', 'Phone']}
            rows={items.map((x) => [x.tenantName, x.name, x.address ?? '-', x.phone ?? '-'])}
          />
          <div className="toolbar">
            {items.map((x) => (
              <div key={x.id} className="toolbar">
                <button type="button" onClick={() => startEdit(x)}>Edit {x.name}</button>
                <button type="button" onClick={() => { setPendingDelete(x); setConfirmOpen(true) }}>Delete {x.name}</button>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}
