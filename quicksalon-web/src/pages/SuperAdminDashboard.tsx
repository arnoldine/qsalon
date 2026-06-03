import { useEffect, useState } from 'react'
import { Building2, GitBranch, Users, CheckCircle2, PlusCircle } from 'lucide-react'
import { Dialog } from '../components/Dialog'
import { FormField } from '../components/FormField'
import { SkeletonCard } from '../components/Skeleton'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import type { SuperAdminStats, TenantAdminItem, TenantProvisionResponse } from '../types'

export function SuperAdminDashboard() {
  const { showToast } = useToast()
  const [stats, setStats] = useState<SuperAdminStats | null>(null)
  const [tenants, setTenants] = useState<TenantAdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showProvision, setShowProvision] = useState(false)
  const [provisioned, setProvisioned] = useState<TenantProvisionResponse | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '', slug: '', contactEmail: '', phone: '', address: '',
    adminUsername: '', adminFullName: '', adminPassword: '',
  })

  async function load() {
    try {
      const [s, t] = await Promise.all([
        api<SuperAdminStats>('/api/superadmin/stats'),
        api<TenantAdminItem[]>('/api/superadmin/tenants'),
      ])
      setStats(s)
      setTenants(t)
    } catch { showToast('Failed to load platform data', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function setField(key: keyof typeof form, val: string) {
    setForm(f => ({ ...f, [key]: val }))
    // Auto-generate slug from name
    if (key === 'name') setForm(f => ({ ...f, name: val, slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }))
  }

  async function provision(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const result = await api<TenantProvisionResponse>('/api/superadmin/tenants/provision', {
        method: 'POST',
        body: JSON.stringify({ ...form, isActive: true }),
      })
      setProvisioned(result)
      setShowProvision(false)
      showToast(`Salon "${result.tenantName}" created`, 'success')
      load()
    } catch (err: any) {
      showToast(err.message || 'Failed to create salon', 'error')
    } finally { setSaving(false) }
  }

  async function toggleStatus(id: string, current: boolean) {
    try {
      await api(`/api/superadmin/tenants/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: !current }) })
      showToast(`Salon ${current ? 'deactivated' : 'activated'}`, 'success')
      load()
    } catch { showToast('Failed to update status', 'error') }
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>Platform Overview</h2>
          <p className="page-subtitle">Manage all salons, branches and users on the platform</p>
        </div>
        <button className="btn-primary" onClick={() => setShowProvision(true)}>
          <PlusCircle size={15} /> New Salon
        </button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="stats-grid">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>
      ) : stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3><Building2 size={14} style={{display:'inline',marginRight:4}}/>Total Salons</h3>
            <p>{stats.totalTenants}</p>
          </div>
          <div className="stat-card">
            <h3><CheckCircle2 size={14} style={{display:'inline',marginRight:4}}/>Active Salons</h3>
            <p>{stats.activeTenants}</p>
          </div>
          <div className="stat-card">
            <h3><GitBranch size={14} style={{display:'inline',marginRight:4}}/>Total Branches</h3>
            <p>{stats.totalBranches}</p>
          </div>
          <div className="stat-card">
            <h3><Users size={14} style={{display:'inline',marginRight:4}}/>Total Users</h3>
            <p>{stats.totalUsers}</p>
          </div>
        </div>
      )}

      {/* Tenants table */}
      <div className="panel" style={{ marginTop: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem' }}>All Salons</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Slug</th><th>Email</th><th>Created</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.name}</strong></td>
                  <td><code style={{fontSize:'0.8rem'}}>{t.slug}</code></td>
                  <td>{t.contactEmail ?? '—'}</td>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge ${t.isActive ? 'badge-confirmed' : 'badge-cancelled'}`}>
                      {t.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', background: t.isActive ? '#ffe2e2' : '#d8f8e8', color: t.isActive ? '#8c1f1f' : '#116241' }}
                      onClick={() => toggleStatus(t.id, t.isActive)}
                    >
                      {t.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && !loading && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>No salons yet. Create your first salon.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Dialog */}
      <Dialog open={showProvision} onClose={() => setShowProvision(false)} title="Create New Salon" size="lg">
        <form onSubmit={provision} className="form-grid">
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.88rem' }}>
            This will create the salon workspace, default branch, all standard roles, and an admin account for the owner.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            <FormField label="Salon Name *">
              <input value={form.name} onChange={e => setField('name', e.target.value)} required placeholder="e.g. Glow Studio" />
            </FormField>
            <FormField label="URL Slug *">
              <input value={form.slug} onChange={e => setField('slug', e.target.value)} required placeholder="e.g. glow-studio" pattern="[a-z0-9\-]+" />
            </FormField>
            <FormField label="Contact Email">
              <input type="email" value={form.contactEmail} onChange={e => setField('contactEmail', e.target.value)} placeholder="owner@salon.com" />
            </FormField>
            <FormField label="Phone">
              <input value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+1 555 0000" />
            </FormField>
            <FormField label="Address" >
              <input value={form.address} onChange={e => setField('address', e.target.value)} placeholder="123 Main St" style={{ gridColumn: '1 / -1' }} />
            </FormField>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '0.25rem 0' }} />
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Admin Account</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            <FormField label="Admin Full Name *">
              <input value={form.adminFullName} onChange={e => setField('adminFullName', e.target.value)} required placeholder="Jane Smith" />
            </FormField>
            <FormField label="Admin Username *">
              <input value={form.adminUsername} onChange={e => setField('adminUsername', e.target.value)} required placeholder="janesmith" />
            </FormField>
            <FormField label="Temp Password">
              <input type="password" value={form.adminPassword} onChange={e => setField('adminPassword', e.target.value)} placeholder="Leave blank to auto-generate" />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--line)' }} onClick={() => setShowProvision(false)}>Cancel</button>
            <button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Salon & Workspace'}</button>
          </div>
        </form>
      </Dialog>

      {/* Provisioned credentials dialog */}
      {provisioned && (
        <Dialog open={!!provisioned} onClose={() => setProvisioned(null)} title="✅ Salon Created" size="sm">
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <p style={{ margin: 0 }}>The salon <strong>{provisioned.tenantName}</strong> has been created with a fully provisioned workspace.</p>
            <div className="panel" style={{ background: '#f0fff4', border: '1px solid #b2dfdb' }}>
              <p style={{ margin: '0 0 0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>Admin Login Credentials</p>
              <p style={{ margin: '0.2rem 0', fontFamily: 'monospace' }}>Username: <strong>{provisioned.adminUsername}</strong></p>
              <p style={{ margin: '0.2rem 0', fontFamily: 'monospace' }}>Password: <strong>{provisioned.tempPassword}</strong></p>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Share these credentials with the salon owner. They should change the password on first login.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setProvisioned(null)}>Done</button>
            </div>
          </div>
        </Dialog>
      )}
    </section>
  )
}
