import { useEffect, useState } from 'react'
import { PackagePlus, PlusCircle, CheckCircle2, XCircle } from 'lucide-react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Dialog } from '../components/Dialog'
import { FormField } from '../components/FormField'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState, LoadingState } from '../components/StateBlocks'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import type { Purchase, PurchaseItem, Product, Supplier } from '../types'

export function PurchasesPage() {
  const { showToast } = useToast()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  // New purchase dialog
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({ supplierId: '', supplierName: '', purchaseDate: new Date().toISOString().slice(0,10), notes: '' })
  const [saving, setSaving] = useState(false)

  // Items dialog
  const [activePurchase, setActivePurchase] = useState<Purchase | null>(null)
  const [items, setItems] = useState<PurchaseItem[]>([])
  const [itemForm, setItemForm] = useState({ productId: '', description: '', quantity: '1', unitCost: '' })

  // Confirm receive/cancel
  const [confirmReceive, setConfirmReceive] = useState<Purchase | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<Purchase | null>(null)

  async function load() {
    try {
      const [p, prod, sup] = await Promise.all([
        api<{ items: Purchase[] }>('/api/purchases'),
        api<Product[]>('/api/inventory/products'),
        api<Supplier[]>('/api/inventory/suppliers'),
      ])
      setPurchases(Array.isArray(p) ? p : (p as any).items ?? [])
      setProducts(prod)
      setSuppliers(sup)
    } catch { showToast('Failed to load purchases', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function createPurchase(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const result = await api<Purchase>('/api/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: newForm.supplierId || null,
          supplierName: newForm.supplierName || null,
          purchaseDate: newForm.purchaseDate,
          notes: newForm.notes || null,
        }),
      })
      showToast('Purchase order created', 'success')
      setShowNew(false)
      setNewForm({ supplierId: '', supplierName: '', purchaseDate: new Date().toISOString().slice(0,10), notes: '' })
      load()
      // Open items dialog for the new purchase
      setActivePurchase(result)
      setItems([])
    } catch (err: any) { showToast(err.message || 'Failed to create purchase', 'error') }
    finally { setSaving(false) }
  }

  async function openItems(purchase: Purchase) {
    setActivePurchase(purchase)
    try {
      const data = await api<{ purchase: Purchase; items: PurchaseItem[] }>(`/api/purchases/${purchase.id}`)
      setItems(data.items)
    } catch { showToast('Failed to load items', 'error') }
  }

  function onProductSelect(productId: string) {
    const prod = products.find(p => p.id === productId)
    setItemForm(f => ({ ...f, productId, description: prod?.name ?? '', unitCost: prod ? String(prod.costPrice) : '' }))
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!activePurchase) return
    try {
      const item = await api<PurchaseItem>(`/api/purchases/${activePurchase.id}/items`, {
        method: 'POST',
        body: JSON.stringify({
          productId: itemForm.productId,
          description: itemForm.description,
          quantity: Number(itemForm.quantity),
          unitCost: Number(itemForm.unitCost),
        }),
      })
      setItems(prev => [...prev, item])
      setItemForm({ productId: '', description: '', quantity: '1', unitCost: '' })
      // Refresh purchase total
      load()
    } catch (err: any) { showToast(err.message || 'Failed to add item', 'error') }
  }

  async function removeItem(itemId: string) {
    if (!activePurchase) return
    try {
      await api(`/api/purchases/${activePurchase.id}/items/${itemId}`, { method: 'DELETE' })
      setItems(prev => prev.filter(i => i.id !== itemId))
      load()
    } catch { showToast('Failed to remove item', 'error') }
  }

  async function receivePurchase() {
    if (!confirmReceive) return
    try {
      await api(`/api/purchases/${confirmReceive.id}/receive`, { method: 'POST' })
      showToast('Purchase received — stock updated', 'success')
      setConfirmReceive(null)
      setActivePurchase(null)
      load()
    } catch (err: any) { showToast(err.message || 'Failed to receive purchase', 'error') }
  }

  async function cancelPurchase() {
    if (!confirmCancel) return
    try {
      await api(`/api/purchases/${confirmCancel.id}/cancel`, { method: 'POST' })
      showToast('Purchase cancelled', 'success')
      setConfirmCancel(null)
      setActivePurchase(null)
      load()
    } catch (err: any) { showToast(err.message || 'Failed to cancel purchase', 'error') }
  }

  const currency = (n: number) => `$${n.toFixed(2)}`

  if (loading) return <LoadingState message="Loading purchases…" />

  return (
    <section>
      <PageHeader title="Purchases" subtitle="Track stock purchases from suppliers"
        actions={<button onClick={() => setShowNew(true)}><PlusCircle size={15} /> New Purchase</button>} />

      {purchases.length === 0 ? (
        <EmptyState title="No purchases yet" description="Create a purchase order to start tracking stock from suppliers." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>PO #</th><th>Supplier</th><th>Date</th><th>Total</th><th>Paid</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {purchases.map(p => (
                <tr key={p.id} className="table-row-clickable" onClick={() => openItems(p)}>
                  <td><strong>{p.purchaseNumber}</strong></td>
                  <td>{p.supplierName ?? '—'}</td>
                  <td>{p.purchaseDate}</td>
                  <td>{currency(p.totalAmount)}</td>
                  <td>{currency(p.amountPaid)}</td>
                  <td><StatusBadge status={p.status as any} /></td>
                  <td onClick={e => e.stopPropagation()}>
                    {p.status === 'Draft' && (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button style={{ background: '#d8f8e8', color: '#116241', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                          onClick={() => setConfirmReceive(p)}><CheckCircle2 size={12} /> Receive</button>
                        <button style={{ background: '#ffe2e2', color: '#8c1f1f', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                          onClick={() => setConfirmCancel(p)}><XCircle size={12} /> Cancel</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Purchase Dialog */}
      <Dialog open={showNew} onClose={() => setShowNew(false)} title="New Purchase Order">
        <form onSubmit={createPurchase} className="form-grid">
          <FormField label="Supplier">
            <select value={newForm.supplierId} onChange={e => setNewForm(f => ({ ...f, supplierId: e.target.value, supplierName: suppliers.find(s => s.id === e.target.value)?.name ?? '' }))}>
              <option value="">— Select supplier —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormField>
          <FormField label="Supplier Name (if not listed)">
            <input value={newForm.supplierName} onChange={e => setNewForm(f => ({ ...f, supplierName: e.target.value }))} placeholder="Enter supplier name" />
          </FormField>
          <FormField label="Purchase Date">
            <input type="date" value={newForm.purchaseDate} onChange={e => setNewForm(f => ({ ...f, purchaseDate: e.target.value }))} required />
          </FormField>
          <FormField label="Notes">
            <input value={newForm.notes} onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
          </FormField>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--line)' }} onClick={() => setShowNew(false)}>Cancel</button>
            <button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create & Add Items'}</button>
          </div>
        </form>
      </Dialog>

      {/* Purchase Items Dialog */}
      {activePurchase && (
        <Dialog open={!!activePurchase} onClose={() => setActivePurchase(null)} title={`Purchase: ${activePurchase.purchaseNumber}`} size="lg">
          <div className="form-grid">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><StatusBadge status={activePurchase.status as any} /></span>
              <strong>Total: {currency(activePurchase.totalAmount)}</strong>
            </div>

            {/* Items list */}
            {items.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Line Total</th>{activePurchase.status === 'Draft' && <th></th>}</tr></thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td>{item.description}</td>
                        <td>{item.quantity}</td>
                        <td>{currency(item.unitCost)}</td>
                        <td>{currency(item.lineTotal)}</td>
                        {activePurchase.status === 'Draft' && (
                          <td><button style={{ background: '#ffe2e2', color: '#8c1f1f', padding: '0.2rem 0.4rem', fontSize: '0.75rem' }} onClick={() => removeItem(item.id)}>Remove</button></td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Add item form (only for Draft) */}
            {activePurchase.status === 'Draft' && (
              <form onSubmit={addItem} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                <FormField label="Product">
                  <select value={itemForm.productId} onChange={e => onProductSelect(e.target.value)} required>
                    <option value="">— Select —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </FormField>
                <FormField label="Qty">
                  <input type="number" min="1" value={itemForm.quantity} onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))} required />
                </FormField>
                <FormField label="Unit Cost">
                  <input type="number" step="0.01" min="0" value={itemForm.unitCost} onChange={e => setItemForm(f => ({ ...f, unitCost: e.target.value }))} required />
                </FormField>
                <button type="submit" style={{ marginBottom: '0' }}><PackagePlus size={14} /></button>
              </form>
            )}

            {activePurchase.status === 'Draft' && (
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: '0.75rem' }}>
                <button style={{ background: '#ffe2e2', color: '#8c1f1f' }} onClick={() => { setActivePurchase(null); setConfirmCancel(activePurchase) }}>
                  <XCircle size={14} /> Cancel PO
                </button>
                <button style={{ background: '#d8f8e8', color: '#116241' }} onClick={() => { setConfirmReceive(activePurchase); setActivePurchase(null) }}
                  disabled={items.length === 0}>
                  <CheckCircle2 size={14} /> Mark as Received
                </button>
              </div>
            )}
          </div>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!confirmReceive}
        title="Receive Purchase?"
        message={`Mark "${confirmReceive?.purchaseNumber}" as received? This will update stock levels for all items.`}
        confirmLabel="Receive"
        onConfirm={receivePurchase}
        onClose={() => setConfirmReceive(null)}
      />
      <ConfirmDialog
        open={!!confirmCancel}
        title="Cancel Purchase?"
        message={`Cancel "${confirmCancel?.purchaseNumber}"? This cannot be undone.`}
        confirmLabel="Cancel Purchase"
        variant="danger"
        onConfirm={cancelPurchase}
        onClose={() => setConfirmCancel(null)}
      />
    </section>
  )
}
