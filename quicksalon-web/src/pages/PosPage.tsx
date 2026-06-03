import { Ban, CreditCard, FilePlus, Plus, Printer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { InvoiceItemForm } from '../components/forms/InvoiceItemForm'
import { FormField } from '../components/FormField'
import { InvoicePreviewDialog } from '../components/InvoicePreviewDialog'
import type { InvoiceReceiptProps } from '../components/InvoiceReceipt'
import { PageHeader } from '../components/PageHeader'
import { PaymentDialog } from '../components/PaymentDialog'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { formatMoney } from '../lib/money'
import type { Customer, Invoice, PagedResult, Product, SalonService, TenantSettings } from '../types'

interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

interface InvoiceDetailsResponse {
  invoice: Invoice
  items: InvoiceItem[]
  payments: Array<{ method: string; amount: number }>
}

const emptySettings: TenantSettings = {
  tenantId: '',
  salonName: '',
  logoUrl: '',
  phone: '',
  email: '',
  address: '',
  openingHours: '',
  defaultCurrency: 'GHS',
  taxRate: 0,
  receiptFooter: '',
  enableAppointmentReminders: false,
  reminderSettings: {
    autoReminderEnabled: false,
    leadTime: '2h',
    defaultChannel: 'SMS',
    numberPrefix: '',
    messageTemplate: 'Hi {customerName}, reminder: your {service} appointment is on {date} at {time} with {employeeName} at {salonName}. Reply STOP to opt out.',
  },
}

export function PosPage() {
  const { showToast } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [services, setServices] = useState<SalonService[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [settings, setSettings] = useState<TenantSettings>(emptySettings)
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetailsResponse | null>(null)

  const [invoiceId, setInvoiceId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [serviceSearch, setServiceSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [itemFormOpen, setItemFormOpen] = useState(false)
  const [voidConfirmOpen, setVoidConfirmOpen] = useState(false)
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)

  async function load() {
    try {
      const [inv, svc, prod, cust, tenantSettings] = await Promise.all([
        api<Invoice[]>('/api/invoices'),
        api<SalonService[]>('/api/services'),
        api<Product[]>('/api/products'),
        api<PagedResult<Customer>>('/api/customers?page=1&pageSize=100'),
        api<TenantSettings>('/api/settings/tenant'),
      ])

      setInvoices(inv)
      setServices(svc)
      setProducts(prod)
      setCustomers(cust.items)
      setSettings(tenantSettings)

      if (!customerId && cust.items[0]) setCustomerId(cust.items[0].id)
      if (!invoiceId && inv[0]) setInvoiceId(inv[0].id)
    } catch {
      showToast('Failed to load POS data.', 'error')
    }
  }

  async function loadInvoiceDetails(id: string) {
    if (!id) {
      setInvoiceDetails(null)
      return
    }

    try {
      const details = await api<InvoiceDetailsResponse>(`/api/invoices/${id}`)
      setInvoiceDetails(details)
    } catch {
      setInvoiceDetails(null)
      showToast('Failed to load invoice details.', 'error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    loadInvoiceDetails(invoiceId)
  }, [invoiceId])

  async function createInvoice() {
    try {
      const invoice = await api<Invoice>('/api/invoices', {
        method: 'POST',
        body: JSON.stringify({ customerId }),
      })
      setInvoiceId(invoice.id)
      await load()
      showToast('Invoice created successfully.', 'success')
    } catch {
      showToast('Failed to create invoice.', 'error')
    }
  }

  async function addInvoiceItem(payload: { itemType: 'Service' | 'Product'; itemId: string; description: string; quantity: number; unitPrice: number }) {
    if (!invoiceId) return
    try {
      await api(`/api/invoices/${invoiceId}/items`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      await load()
      await loadInvoiceDetails(invoiceId)
      showToast('Item added to invoice.', 'success')
    } catch {
      showToast('Failed to add invoice item.', 'error')
    }
  }

  async function pay(method: 'Cash' | 'Card' | 'MobileMoney', amount: number) {
    if (!invoiceId) return
    try {
      await api(`/api/invoices/${invoiceId}/payments`, {
        method: 'POST',
        body: JSON.stringify({ method, amount }),
      })
      setPaymentMethod(method)
      await load()
      await loadInvoiceDetails(invoiceId)
      showToast(`Payment received via ${method}.`, 'success')
    } catch {
      showToast('Failed to post payment.', 'error')
    }
  }

  async function voidInvoice() {
    if (!invoiceId) return

    try {
      await api(`/api/invoices/${invoiceId}/void`, { method: 'POST' })
      setVoidConfirmOpen(false)
      await load()
      await loadInvoiceDetails(invoiceId)
      showToast('Invoice voided successfully.', 'success')
    } catch {
      showToast('Failed to void invoice.', 'error')
    }
  }

  const selected = useMemo(() => invoices.find((x) => x.id === invoiceId), [invoices, invoiceId])
  const subtotal = invoiceDetails?.items.reduce((sum, item) => sum + item.lineTotal, 0) ?? 0
  const tax = subtotal * ((settings.taxRate ?? 0) / 100)
  const total = subtotal + tax
  const amountPaid = selected?.amountPaid ?? 0
  const balance = Math.max(total - amountPaid, 0)

  const receiptProps: InvoiceReceiptProps = {
    invoiceNumber: selected?.invoiceNumber ?? '',
    date: new Date().toLocaleDateString(),
    items: invoiceDetails?.items ?? [],
    payments: invoiceDetails?.payments ?? [],
    subtotal,
    tax,
    taxRate: settings.taxRate ?? 0,
    total,
    amountPaid,
    balance,
    currency: settings.defaultCurrency || 'GHS',
    salonName: settings.salonName || 'Salon',
    salonPhone: settings.phone ?? undefined,
    salonAddress: settings.address ?? undefined,
    salonEmail: settings.email ?? undefined,
    receiptFooter: settings.receiptFooter ?? undefined,
    status: selected?.status ?? '',
  }

  const receipt = (
    <div className="receipt-preview">
      <h4>{settings.salonName || 'Salon'}</h4>
      <p>{new Date().toLocaleString()}</p>
      <p>{selected?.invoiceNumber || 'No invoice selected'}</p>
      {invoiceDetails?.items.length ? invoiceDetails.items.map((item) => (
        <div key={item.id} className="receipt-item">
          <span>{item.description}</span>
          <span>{item.quantity} x {formatMoney(item.unitPrice, settings.defaultCurrency)}</span>
        </div>
      )) : <p>No line items yet.</p>}
      <hr />
      <div className="receipt-item"><strong>Subtotal</strong><strong>{formatMoney(subtotal, settings.defaultCurrency)}</strong></div>
      <div className="receipt-item"><strong>Tax</strong><strong>{formatMoney(tax, settings.defaultCurrency)}</strong></div>
      <div className="receipt-item"><strong>Total</strong><strong>{formatMoney(total, settings.defaultCurrency)}</strong></div>
      <p>Payment Method: {paymentMethod}</p>
      {settings.receiptFooter ? <p>{settings.receiptFooter}</p> : null}
    </div>
  )

  return (
    <section>
      <PageHeader title="POS" subtitle="Search services/products, build cart, and receive payments" />
      <button className="receipt-mobile-toggle" onClick={() => setMobilePreviewOpen((open) => !open)}>
        {mobilePreviewOpen ? 'Hide Preview' : 'Preview Receipt'}
      </button>
      <div className="pos-layout">
        <div>
          <div className="toolbar">
            <FormField label="Customer">
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </FormField>
            <button onClick={createInvoice}><FilePlus size={16} /> New Invoice</button>
            <FormField label="Active Invoice">
              <select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
                <option value="">Select</option>
                {invoices.map((i) => <option key={i.id} value={i.id}>{i.invoiceNumber}</option>)}
              </select>
            </FormField>
          </div>

          <div className="split-grid">
            <article className="panel">
              <h3>Services</h3>
              <input placeholder="Search service" value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} />
              <ul>{services.filter((s) => s.name.toLowerCase().includes(serviceSearch.toLowerCase())).map((s) => <li key={s.id}><button onClick={() => addInvoiceItem({ itemType: 'Service', itemId: s.id, description: s.name, quantity: 1, unitPrice: s.price })}>{s.name} - {formatMoney(s.price, settings.defaultCurrency)}</button></li>)}</ul>
            </article>
            <article className="panel">
              <h3>Products</h3>
              <input placeholder="Search product" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
              <ul>{products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase())).map((p) => <li key={p.id}><button onClick={() => addInvoiceItem({ itemType: 'Product', itemId: p.id, description: p.name, quantity: 1, unitPrice: p.sellingPrice })}>{p.name} - {formatMoney(p.sellingPrice, settings.defaultCurrency)}</button></li>)}</ul>
            </article>
          </div>

          <div className="panel payment-summary">
            <h3>Payment Summary</h3>
            {selected ? (
              <div>
                <p><strong>{selected.invoiceNumber}</strong> <StatusBadge status={selected.status as any} /></p>
                <p>Total: {formatMoney(selected.totalAmount, settings.defaultCurrency)}</p>
                <p>Paid: {formatMoney(selected.amountPaid, settings.defaultCurrency)}</p>
                <p>Balance: {formatMoney(Math.max(selected.totalAmount - selected.amountPaid, 0), settings.defaultCurrency)}</p>
              </div>
            ) : <p>Select an invoice to view payment summary.</p>}
          </div>

          <div className="toolbar">
            <button type="button" className="secondary-button" onClick={() => setItemFormOpen(true)}><Plus size={16} /> Add Item</button>
            <button type="button" onClick={() => setPaymentOpen(true)}><CreditCard size={16} /> Process Payment</button>
            <button type="button" className="secondary-button" onClick={() => setPrintOpen(true)}><Printer size={16} /> Print Receipt</button>
            <button type="button" className="danger-button" onClick={() => setVoidConfirmOpen(true)}><Ban size={16} /> Void Invoice</button>
          </div>

          <DataTable headers={['Invoice', 'Status', 'Total', 'Paid']} rows={invoices.map((i) => [i.invoiceNumber, i.status, i.totalAmount, i.amountPaid])} />
        </div>

        <aside>
          {receipt}
        </aside>
      </div>

      <div className={`receipt-mobile-sheet${mobilePreviewOpen ? ' open' : ''}`}>
        {receipt}
      </div>

      {/* FAB for mobile */}
      <button className="fab" title="New Invoice" onClick={() => void createInvoice()}>
        <Plus size={24} />
      </button>

      <InvoiceItemForm
        open={itemFormOpen}
        options={[
          ...services.map((service) => ({ id: service.id, name: service.name, price: service.price, type: 'Service' as const })),
          ...products.map((product) => ({ id: product.id, name: product.name, price: product.sellingPrice, type: 'Product' as const })),
        ]}
        onClose={() => setItemFormOpen(false)}
        onSave={addInvoiceItem}
      />

      <PaymentDialog
        open={paymentOpen}
        currency={settings.defaultCurrency || 'GHS'}
        invoiceNumber={selected?.invoiceNumber || 'Invoice'}
        items={invoiceDetails?.items ?? []}
        subtotal={subtotal}
        tax={tax}
        onClose={() => setPaymentOpen(false)}
        onConfirm={pay}
        onPrint={() => { setPaymentOpen(false); setPrintOpen(true) }}
        onNewSale={() => {
          setPaymentOpen(false)
          void createInvoice()
        }}
      />

      <InvoicePreviewDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        receipt={receiptProps}
      />

      <ConfirmDialog
        open={voidConfirmOpen}
        title={`Void Invoice ${selected?.invoiceNumber || ''}?`}
        message="Voided invoices cannot be recovered."
        confirmLabel="Void Invoice"
        cancelLabel="Keep Invoice"
        variant="danger"
        onClose={() => setVoidConfirmOpen(false)}
        onConfirm={voidInvoice}
      />
    </section>
  )
}
