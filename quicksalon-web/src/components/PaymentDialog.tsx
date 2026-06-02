import { CheckCircle2, CreditCard, Smartphone, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Dialog } from './Dialog'

interface PaymentDialogProps {
  open: boolean
  currency: string
  invoiceNumber: string
  items: Array<{ id: string; description: string; quantity: number; unitPrice: number; lineTotal: number }>
  subtotal: number
  tax: number
  onClose: () => void
  onConfirm: (method: 'Cash' | 'Card' | 'MobileMoney', amount: number) => Promise<void>
  onPrint: () => void
  onNewSale: () => void
}

const tipOptions = [0, 10, 15, 20]

export function PaymentDialog({ open, currency, invoiceNumber, items, subtotal, tax, onClose, onConfirm, onPrint, onNewSale }: PaymentDialogProps) {
  const [method, setMethod] = useState<'Cash' | 'Card' | 'MobileMoney'>('Cash')
  const [tipPercent, setTipPercent] = useState<number | 'custom'>(0)
  const [customTip, setCustomTip] = useState(0)
  const [cashReceived, setCashReceived] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [paid, setPaid] = useState(false)

  const tipAmount = useMemo(() => {
    if (tipPercent === 'custom') return customTip
    return (subtotal * tipPercent) / 100
  }, [customTip, subtotal, tipPercent])

  const total = subtotal + tax + tipAmount
  const changeDue = method === 'Cash' ? Math.max(cashReceived - total, 0) : 0

  async function confirmPayment() {
    setSaving(true)
    setError('')
    try {
      await onConfirm(method, total)
      setPaid(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to process payment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={paid ? 'Payment Complete' : `Process Payment - ${invoiceNumber}`}
      size="md"
      actions={paid ? (
        <>
          <button type="button" className="secondary-button" onClick={onPrint}>Print Receipt</button>
          <button type="button" onClick={onNewSale}>New Sale</button>
        </>
      ) : (
        <>
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button type="button" onClick={() => void confirmPayment()} disabled={saving}>{saving ? <span className="inline-spinner" aria-label="Saving" /> : 'Confirm Payment'}</button>
        </>
      )}
    >
      {paid ? (
        <div className="payment-success">
          <CheckCircle2 size={56} />
          <h3>Payment of {currency} {total.toFixed(2)} received</h3>
        </div>
      ) : (
        <div className="form-grid">
          <div className="state-block">
            <strong>Order Summary</strong>
            {items.map((item) => (
              <div key={item.id} className="receipt-item">
                <span>{item.description} x {item.quantity}</span>
                <span>{currency} {item.lineTotal.toFixed(2)}</span>
              </div>
            ))}
            <div className="receipt-item"><strong>Subtotal</strong><strong>{currency} {subtotal.toFixed(2)}</strong></div>
            <div className="receipt-item"><strong>Tax</strong><strong>{currency} {tax.toFixed(2)}</strong></div>
            <div className="receipt-item"><strong>Total</strong><strong>{currency} {total.toFixed(2)}</strong></div>
          </div>

          <div className="payment-method-row">
            <button type="button" className={method === 'Cash' ? 'active' : ''} onClick={() => setMethod('Cash')}><Wallet size={16} /> Cash</button>
            <button type="button" className={method === 'Card' ? 'active' : ''} onClick={() => setMethod('Card')}><CreditCard size={16} /> Card</button>
            <button type="button" className={method === 'MobileMoney' ? 'active' : ''} onClick={() => setMethod('MobileMoney')}><Smartphone size={16} /> Mobile Money</button>
          </div>

          <div className="tip-row">
            {tipOptions.map((value) => <button key={value} type="button" className={tipPercent === value ? 'active' : ''} onClick={() => setTipPercent(value)}>{value === 0 ? 'None' : `${value}%`}</button>)}
            <button type="button" className={tipPercent === 'custom' ? 'active' : ''} onClick={() => setTipPercent('custom')}>Custom</button>
          </div>

          {tipPercent === 'custom' ? (
            <label className="field">
              <span>Custom tip ({currency})</span>
              <input type="number" min={0} value={customTip} onChange={(e) => setCustomTip(Number(e.target.value))} />
            </label>
          ) : null}

          {method === 'Cash' ? (
            <label className="field">
              <span>Cash received</span>
              <input type="number" min={0} value={cashReceived} onChange={(e) => setCashReceived(Number(e.target.value))} />
              <small className="hint">Change due: {currency} {changeDue.toFixed(2)}</small>
            </label>
          ) : null}

          {error ? <p className="error">{error}</p> : null}
        </div>
      )}
    </Dialog>
  )
}
