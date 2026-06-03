import { useEffect, useState } from 'react'
import { PlusCircle, Pencil, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Dialog } from '../components/Dialog'
import { FormField } from '../components/FormField'
import { PageHeader } from '../components/PageHeader'
import { EmptyState, LoadingState } from '../components/StateBlocks'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import type { Expense } from '../types'

const PAYMENT_METHODS = ['Cash', 'Card', 'MobileMoney', 'BankTransfer', 'Cheque']

const emptyForm = {
  category: '', description: '', amount: '',
  expenseDate: new Date().toISOString().slice(0, 10),
  paymentMethod: 'Cash', reference: '',
}

export function ExpensesPage() {
  const { showToast } = useToast()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('')
  const [summary, setSummary] = useState<{ byCategory: { category: string; total: number; count: number }[]; grandTotal: number } | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Expense | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)

  const now = new Date()

  async function load() {
    try {
      const [exp, cats, sum] = await Promise.all([
        api<{ items: Expense[]; totalCount: number }>('/api/expenses'),
        api<string[]>('/api/expenses/categories'),
        api<{ byCategory: { category: string; total: number; count: number }[]; grandTotal: number }>(
          `/api/expenses/summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`
        ),
      ])
      setExpenses(exp.items)
      setCategories(cats)
      setSummary(sum)
    } catch { showToast('Failed to load expenses', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditTarget(null)
    setForm({ ...emptyForm })
    setShowForm(true)
  }

  function openEdit(exp: Expense) {
    setEditTarget(exp)
    setForm({
      category: exp.category,
      description: exp.description,
      amount: String(exp.amount),
      expenseDate: exp.expenseDate,
      paymentMethod: exp.paymentMethod,
      reference: exp.reference ?? '',
    })
    setShowForm(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        category: form.category,
        description: form.description,
        amount: Number(form.amount),
        expenseDate: form.expenseDate,
        paymentMethod: form.paymentMethod,
        reference: form.reference || null,
      }
      if (editTarget) {
        await api(`/api/expenses/${editTarget.id}`, { method: 'PUT', body: JSON.stringify(body) })
        showToast('Expense updated', 'success')
      } else {
        await api('/api/expenses', { method: 'POST', body: JSON.stringify(body) })
        showToast('Expense recorded', 'success')
      }
      setShowForm(false)
      load()
    } catch (err: any) { showToast(err.message || 'Failed to save expense', 'error') }
    finally { setSaving(false) }
  }

  async function deleteExpense() {
    if (!deleteTarget) return
    try {
      await api(`/api/expenses/${deleteTarget.id}`, { method: 'DELETE' })
      showToast('Expense deleted', 'success')
      setDeleteTarget(null)
      load()
    } catch { showToast('Failed to delete expense', 'error') }
  }

  const filtered = filterCategory ? expenses.filter(e => e.category === filterCategory) : expenses
  const currency = (n: number) => `$${n.toFixed(2)}`

  if (loading) return <LoadingState message="Loading expenses…" />

  return (
    <section>
      <PageHeader title="Expenses" subtitle="Track salon operating costs and outgoings"
        actions={<button onClick={openNew}><PlusCircle size={15} /> Record Expense</button>} />

      {/* Monthly summary */}
      {summary && summary.byCategory.length > 0 && (
        <div className="split-grid" style={{ marginBottom: '1rem' }}>
          <div className="panel">
            <h3 style={{ margin: '0 0 0.75rem' }}>This Month's Spending</h3>
            {summary.byCategory.map(c => (
              <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--line)', fontSize: '0.88rem' }}>
                <span>{c.category} <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>({c.count}x)</span></span>
                <strong>{currency(c.total)}</strong>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0 0', fontWeight: 700 }}>
              <span>Total</span>
              <span style={{ color: 'var(--accent)' }}>{currency(summary.grandTotal)}</span>
            </div>
          </div>
          <div className="panel">
            <h3 style={{ margin: '0 0 0.75rem' }}>Category Breakdown</h3>
            {summary.byCategory.map(c => {
              const pct = summary.grandTotal > 0 ? (c.total / summary.grandTotal) * 100 : 0
              return (
                <div key={c.category} style={{ marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.2rem' }}>
                    <span>{c.category}</span><span>{pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--line)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: '3px' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="toolbar">
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No expenses recorded" description="Record your first expense to start tracking costs." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Exp #</th><th>Date</th><th>Category</th><th>Description</th><th>Method</th><th>Amount</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(exp => (
                <tr key={exp.id}>
                  <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{exp.expenseNumber}</td>
                  <td>{exp.expenseDate}</td>
                  <td><span className="status-badge badge-booked">{exp.category}</span></td>
                  <td>{exp.description}</td>
                  <td style={{ fontSize: '0.82rem' }}>{exp.paymentMethod}</td>
                  <td><strong style={{ color: 'var(--accent)' }}>{currency(exp.amount)}</strong></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--text)', padding: '0.25rem 0.4rem' }} onClick={() => openEdit(exp)}>
                        <Pencil size={12} />
                      </button>
                      <button style={{ background: '#ffe2e2', color: '#8c1f1f', padding: '0.25rem 0.4rem' }} onClick={() => setDeleteTarget(exp)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editTarget ? 'Edit Expense' : 'Record Expense'}
      >
        <form onSubmit={save} className="form-grid">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            <FormField label="Category *">
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required>
                <option value="">— Select —</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Date *">
              <input type="date" value={form.expenseDate} onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))} required />
            </FormField>
          </div>
          <FormField label="Description *">
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required placeholder="e.g. Monthly rent payment" />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            <FormField label="Amount *">
              <input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required placeholder="0.00" />
            </FormField>
            <FormField label="Payment Method">
              <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Reference / Receipt #">
            <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Optional" />
          </FormField>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--line)' }} onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" disabled={saving}>{saving ? 'Saving…' : editTarget ? 'Update' : 'Record Expense'}</button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Expense?"
        message={`Delete "${deleteTarget?.description}" (${deleteTarget ? `$${deleteTarget.amount.toFixed(2)}` : ''})? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={deleteExpense}
        onClose={() => setDeleteTarget(null)}
      />
    </section>
  )
}
