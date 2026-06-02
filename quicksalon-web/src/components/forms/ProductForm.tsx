import { useEffect, useState } from 'react'
import { Dialog } from '../Dialog'
import { FormField } from '../FormField'
import { FormFooter } from './FormFooter'

interface SupplierOption {
  id: string
  name: string
}

interface ProductPayload {
  sku: string
  name: string
  costPrice: number
  sellingPrice: number
  quantityOnHand: number
  reorderLevel: number
  supplierId?: string | null
  isActive: boolean
}

interface ProductFormProps {
  open: boolean
  mode: 'new' | 'edit'
  suppliers?: SupplierOption[]
  initial?: Partial<ProductPayload>
  onClose: () => void
  onSave: (payload: ProductPayload) => Promise<void>
}

export function ProductForm({ open, mode, suppliers = [], initial, onClose, onSave }: ProductFormProps) {
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [costPrice, setCostPrice] = useState(0)
  const [sellingPrice, setSellingPrice] = useState(0)
  const [quantityOnHand, setQuantityOnHand] = useState(0)
  const [reorderLevel, setReorderLevel] = useState(5)
  const [supplierId, setSupplierId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    if (!open) return
    setSku(initial?.sku ?? '')
    setName(initial?.name ?? '')
    setCostPrice(initial?.costPrice ?? 0)
    setSellingPrice(initial?.sellingPrice ?? 0)
    setQuantityOnHand(initial?.quantityOnHand ?? 0)
    setReorderLevel(initial?.reorderLevel ?? 5)
    setSupplierId(initial?.supplierId ?? '')
    setIsActive(initial?.isActive ?? true)
    setError('')
    setShowErrors(false)
  }, [initial, open])

  const missing = {
    sku: !sku.trim(),
    name: !name.trim(),
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setShowErrors(true)
    if (missing.sku || missing.name) return

    setSaving(true)
    setError('')
    try {
      await onSave({ sku: sku.trim(), name: name.trim(), costPrice, sellingPrice, quantityOnHand, reorderLevel, supplierId: supplierId || null, isActive })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} closeOnOverlay={false} title={`${mode === 'new' ? 'New' : 'Edit'} Product`} size="md" actions={<FormFooter saving={saving} saveLabel="Save" onCancel={onClose} formId="product-form" />}>
      <form id="product-form" onSubmit={handleSubmit} className="form-grid">
        <FormField label="SKU"><input value={sku} onChange={(e) => setSku(e.target.value)} className={showErrors && missing.sku ? 'input-invalid' : ''} /></FormField>
        <FormField label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className={showErrors && missing.name ? 'input-invalid' : ''} /></FormField>
        <FormField label="Cost Price"><input type="number" min={0} step="0.01" value={costPrice} onChange={(e) => setCostPrice(Number(e.target.value))} /></FormField>
        <FormField label="Selling Price"><input type="number" min={0} step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(Number(e.target.value))} /></FormField>
        <FormField label="Quantity"><input type="number" value={quantityOnHand} onChange={(e) => setQuantityOnHand(Number(e.target.value))} /></FormField>
        <FormField label="Reorder Level"><input type="number" min={0} value={reorderLevel} onChange={(e) => setReorderLevel(Number(e.target.value))} /></FormField>
        <FormField label="Supplier">
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">None</option>
            {suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </FormField>
        <label className="checkbox-row"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /><span>Active</span></label>
        {error ? <p className="error">{error}</p> : null}
      </form>
    </Dialog>
  )
}
