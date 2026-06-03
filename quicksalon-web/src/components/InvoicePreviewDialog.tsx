import { Download, Printer } from 'lucide-react'
import { Dialog } from './Dialog'
import { InvoiceReceipt } from './InvoiceReceipt'
import type { InvoiceReceiptProps } from './InvoiceReceipt'

interface InvoicePreviewDialogProps {
  open: boolean
  onClose: () => void
  receipt: InvoiceReceiptProps
}

function handlePrint() {
  const printArea = document.getElementById('receipt-print-area')
  const receipt = document.querySelector('.invoice-receipt')
  if (printArea && receipt) {
    printArea.innerHTML = receipt.outerHTML
  }
  window.print()
}

export function InvoicePreviewDialog({ open, onClose, receipt }: InvoicePreviewDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Invoice Preview"
      size="lg"
      actions={(
        <>
          <button type="button" className="secondary-button" onClick={onClose}>Close</button>
          <button type="button" className="secondary-button" onClick={handlePrint}>
            <Download size={16} /> Save as PDF
          </button>
          <button type="button" onClick={handlePrint}>
            <Printer size={16} /> Print
          </button>
        </>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <p className="hint" style={{ textAlign: 'center', margin: 0 }}>
          Tip: In the print dialog, select &ldquo;Save as PDF&rdquo; to get a PDF file.
        </p>
        <InvoiceReceipt {...receipt} />
      </div>
    </Dialog>
  )
}
