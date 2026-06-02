import { useEffect, useState } from 'react'
import { DataTable } from '../components/DataTable'
import { TenantForm } from '../components/forms/TenantForm'
import { PageHeader } from '../components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/StateBlocks'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import type { TenantAdminItem } from '../types'

const initialForm = {
  name: '',
  slug: '',
  contactEmail: '',
  phone: '',
  address: '',
  isActive: true,
}

export function TenantsPage() {
  const { showToast } = useToast()
  const [items, setItems] = useState<TenantAdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState(false)
  const [q, setQ] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState('')
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

  async function load() {
    setLoading(true)
    setError('')
    setActionMessage('')
    try {
      const result = await api<TenantAdminItem[]>(`/api/superadmin/tenants?q=${encodeURIComponent(q)}`)
      setItems(result)
      showToast('Tenants loaded.', 'info')
    } catch {
      setError('Unable to load tenants.')
      showToast('Unable to load tenants.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function startEdit(item: TenantAdminItem) {
    setActionMessage('')
    setEditingId(item.id)
    setForm({
      name: item.name,
      slug: item.slug,
      contactEmail: item.contactEmail ?? '',
      phone: item.phone ?? '',
      address: item.address ?? '',
      isActive: item.isActive,
    })
  }

  async function toggleActive(item: TenantAdminItem) {
    setActionMessage('')
    try {
      await api(`/api/superadmin/tenants/${item.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !item.isActive }),
      })
      await load()
      setActionError(false)
      setActionMessage(`Tenant \"${item.name}\" ${item.isActive ? 'deactivated' : 'activated'}.`)
      showToast(`Tenant ${item.isActive ? 'deactivated' : 'activated'}.`, 'success')
    } catch (e) {
      setActionError(true)
      setActionMessage(getApiErrorMessage(e, 'Unable to update tenant status.'))
      showToast('Unable to update tenant status.', 'error')
    }
  }

  return (
    <section>
      <PageHeader title="Tenant Management" subtitle="Create and maintain tenant profiles" />
      <div className="toolbar">
        <button type="button" onClick={() => { setEditingId(''); setFormOpen(true) }}>New Tenant</button>
      </div>

      <div className="toolbar">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, slug, email" />
        <button onClick={load}>Search</button>
      </div>

      <TenantForm
        open={formOpen}
        mode={editingId ? 'edit' : 'new'}
        initial={form}
        onClose={() => setFormOpen(false)}
        onSave={async (payload) => {
          setForm({
            name: payload.name,
            slug: payload.slug,
            contactEmail: payload.contactEmail ?? '',
            phone: payload.phone ?? '',
            address: payload.address ?? '',
            isActive: payload.isActive,
          })
          if (editingId) {
            await api(`/api/superadmin/tenants/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
          } else {
            await api('/api/superadmin/tenants', { method: 'POST', body: JSON.stringify(payload) })
          }
          setEditingId('')
          setForm(initialForm)
          await load()
          showToast(editingId ? 'Tenant updated successfully.' : 'Tenant created successfully.', 'success')
        }}
      />

      {loading ? <LoadingState message="Loading tenants..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && actionMessage ? (
        <p className={actionError ? 'error' : 'hint'}>{actionMessage}</p>
      ) : null}
      {!loading && !error && items.length === 0 ? <EmptyState title="No tenants found" description="Create your first tenant from the form above." /> : null}
      {!loading && !error && items.length > 0 ? (
        <>
          <DataTable
            headers={['Name', 'Slug', 'Email', 'Phone', 'Active']}
            rows={items.map((x) => [x.name, x.slug, x.contactEmail ?? '-', x.phone ?? '-', x.isActive ? 'Yes' : 'No'])}
          />
          <div className="toolbar">
            {items.map((x) => (
              <div key={x.id} className="toolbar">
                <button type="button" onClick={() => startEdit(x)}>Edit {x.name}</button>
                <button type="button" onClick={() => toggleActive(x)}>{x.isActive ? 'Deactivate' : 'Activate'} {x.name}</button>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}
