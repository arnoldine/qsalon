import { Pencil, Search, Trash2, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { Dialog } from '../components/Dialog'
import { CustomerForm } from '../components/forms/CustomerForm'
import { PageHeader } from '../components/PageHeader'
import { SkeletonRow } from '../components/Skeleton'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import type { Customer, PagedResult } from '../types'

export function CustomersPage() {
  const { showToast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [historyMessage, setHistoryMessage] = useState('')
  const [visitHistoryCount, setVisitHistoryCount] = useState(0)
  const [lastVisitDate, setLastVisitDate] = useState('N/A')

  async function load(targetPage = page) {
    setLoading(true)
    try {
      const result = await api<PagedResult<Customer>>(`/api/customers?q=${encodeURIComponent(q)}&page=${targetPage}&pageSize=${pageSize}`)
      setCustomers(result.items)
      setTotalCount(result.totalCount)
      setPage(targetPage)
    } catch {
      showToast('Failed to load customers.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
  }, [])

  async function saveCustomer(payload: { firstName: string; lastName: string; phone: string; email?: string | null; loyaltyPoints: number }) {
    if (selectedCustomer && editMode) {
      await api(`/api/customers/${selectedCustomer.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      showToast('Customer updated successfully.', 'success')
    } else {
      await api('/api/customers', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      showToast('Customer created successfully.', 'success')
    }
    setEditMode(false)
    await load(1)
  }

  async function viewHistory(customerId: string) {
    try {
      const history = await api<Array<{ appointmentDate: string }>>(`/api/customers/${customerId}/visit-history`)
      setHistoryMessage(history.length === 0 ? 'No visit history yet.' : `Visit history entries: ${history.length}`)
      setVisitHistoryCount(history.length)
      setLastVisitDate(history[0]?.appointmentDate ?? 'N/A')
      showToast('Customer history loaded.', 'info')
    } catch {
      showToast('Failed to load customer history.', 'error')
    }
  }

  async function removeSelectedCustomer() {
    if (!selectedCustomer) return

    try {
      await api(`/api/customers/${selectedCustomer.id}`, { method: 'DELETE' })
      showToast('Customer deleted successfully.', 'success')
      setConfirmOpen(false)
      setDetailOpen(false)
      setSelectedCustomer(null)
      await load(1)
    } catch {
      showToast('Failed to delete customer.', 'error')
    }
  }

  async function openCustomerDetails(customer: Customer) {
    setSelectedCustomer(customer)
    setDetailOpen(true)
    setEditMode(false)
    await viewHistory(customer.id)
  }

  return (
    <section>
      <PageHeader
        title="Customers"
        subtitle="Search-first customer management with loyalty and visit history"
        actions={<button onClick={() => { setSelectedCustomer(null); setEditMode(false); setFormOpen(true) }}><UserPlus size={16} /> New Customer</button>}
      />
      <div className="toolbar">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers" />
        <button onClick={() => load(1)}><Search size={16} /> Search</button>
      </div>

      <CustomerForm
        open={formOpen}
        mode={selectedCustomer && editMode ? 'edit' : 'new'}
        initial={selectedCustomer && editMode ? {
          firstName: selectedCustomer.firstName,
          lastName: selectedCustomer.lastName,
          phone: selectedCustomer.phone,
          email: selectedCustomer.email,
          loyaltyPoints: selectedCustomer.loyaltyPoints,
        } : undefined}
        onClose={() => setFormOpen(false)}
        onSave={saveCustomer}
      />

      <Dialog
        open={detailOpen && !!selectedCustomer}
        onClose={() => setDetailOpen(false)}
        title="Customer Details"
        size="md"
        actions={(
          <>
            <button type="button" className="secondary-button" onClick={() => setDetailOpen(false)}>Close</button>
            <button type="button" onClick={() => { setEditMode(true); setFormOpen(true) }} title="Edit"><Pencil size={16} /> Edit</button>
            <button type="button" className="danger-button" onClick={() => setConfirmOpen(true)} title="Delete"><Trash2 size={16} /> Delete</button>
          </>
        )}
      >
        {selectedCustomer ? (
          <div className="form-grid">
            <p><strong>Name:</strong> {selectedCustomer.firstName} {selectedCustomer.lastName}</p>
            <p><strong>Phone:</strong> {selectedCustomer.phone}</p>
            <p><strong>Email:</strong> {selectedCustomer.email || 'N/A'}</p>
            <p><strong>Loyalty points balance:</strong> {selectedCustomer.loyaltyPoints}</p>
            <p><strong>Appointment history count:</strong> {visitHistoryCount}</p>
            <p><strong>Last visit date:</strong> {lastVisitDate}</p>
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Customer?"
        message={`This will permanently remove ${selectedCustomer?.firstName || 'this customer'} and all history.`}
        confirmLabel="Delete Customer"
        cancelLabel="Keep Customer"
        variant="danger"
        onClose={() => setConfirmOpen(false)}
        onConfirm={removeSelectedCustomer}
      />

      {historyMessage ? <p className="hint">{historyMessage}</p> : null}
      {loading ? (
        <div className="skeleton-row-grid">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : (
        <DataTable
          headers={['Number', 'Name', 'Phone', 'Email', 'Points']}
          rows={customers.map((c) => [c.customerNumber, `${c.firstName} ${c.lastName}`, c.phone, c.email, c.loyaltyPoints])}
          onRowClick={(_, row) => {
            const customer = customers.find((item) => item.customerNumber === String(row[0]))
            if (customer) {
              void openCustomerDetails(customer)
            }
          }}
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          onPageChange={(nextPage) => load(nextPage)}
        />
      )}
      <div className="toolbar">
        {customers.slice(0, 5).map((c) => (
          <button key={c.id} onClick={() => void openCustomerDetails(c)}>View Customer History: {c.firstName}</button>
        ))}
      </div>
    </section>
  )
}
