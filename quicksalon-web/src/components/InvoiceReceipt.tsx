export interface InvoiceReceiptProps {
  invoiceNumber: string
  date: string
  customerName?: string
  items: { description: string; quantity: number; unitPrice: number; lineTotal: number }[]
  payments: { method: string; amount: number }[]
  subtotal: number
  tax: number
  taxRate: number
  total: number
  amountPaid: number
  balance: number
  currency: string
  salonName: string
  salonPhone?: string
  salonAddress?: string
  salonEmail?: string
  logoUrl?: string
  receiptFooter?: string
  status: string
}

export function InvoiceReceipt(props: InvoiceReceiptProps) {
  const {
    invoiceNumber, date, customerName, items, payments,
    subtotal, tax, taxRate, total, amountPaid, balance,
    currency, salonName, salonPhone, salonAddress, salonEmail,
    receiptFooter, status,
  } = props

  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`

  return (
    <div className="invoice-receipt">
      <h2>{salonName}</h2>
      {salonAddress ? <p className="receipt-center">{salonAddress}</p> : null}
      {salonPhone ? <p className="receipt-center">Tel: {salonPhone}</p> : null}
      {salonEmail ? <p className="receipt-center">{salonEmail}</p> : null}

      <hr className="receipt-divider" />

      <p className="receipt-center"><strong>TAX INVOICE</strong></p>

      <div className="receipt-row"><span>Invoice #:</span><span>{invoiceNumber}</span></div>
      <div className="receipt-row"><span>Date:</span><span>{date}</span></div>
      <div className="receipt-row"><span>Status:</span><span>{status}</span></div>
      {customerName ? <div className="receipt-row"><span>Customer:</span><span>{customerName}</span></div> : null}

      <hr className="receipt-divider" />

      {items.map((item, idx) => (
        <div key={idx} className="receipt-row" style={{ flexWrap: 'wrap', gap: '0.1rem' }}>
          <span style={{ flex: '1 1 60%' }}>{item.description}</span>
          <span style={{ flex: '1 1 38%', textAlign: 'right' }}>{item.quantity} × {fmt(item.unitPrice)} = {fmt(item.lineTotal)}</span>
        </div>
      ))}

      <hr className="receipt-divider" />

      <div className="receipt-row"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
      <div className="receipt-row"><span>Tax ({taxRate}%)</span><span>{fmt(tax)}</span></div>
      <div className="receipt-total-row"><span>TOTAL</span><span>{fmt(total)}</span></div>

      <hr className="receipt-divider" />

      <p className="receipt-center"><strong>Payments</strong></p>
      {payments.map((p, idx) => (
        <div key={idx} className="receipt-row"><span>{p.method}</span><span>{fmt(p.amount)}</span></div>
      ))}
      <div className="receipt-row"><span>Amount Paid</span><span>{fmt(amountPaid)}</span></div>
      <div className="receipt-row receipt-total-row">
        <span>Balance Due</span>
        <span className={balance > 0 ? 'balance-due' : 'balance-paid'}>{fmt(balance)}</span>
      </div>

      <hr className="receipt-divider" />

      {receiptFooter ? <p className="receipt-footer">{receiptFooter}</p> : null}
      <p className="receipt-center receipt-footer">Thank you!</p>
    </div>
  )
}
