import { ArrowUpDown, PackagePlus, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { Dialog } from '../components/Dialog'
import { ProductForm } from '../components/forms/ProductForm'
import { SupplierForm } from '../components/forms/SupplierForm'
import { PageHeader } from '../components/PageHeader'
import { SkeletonRow } from '../components/Skeleton'
import { StockAdjustDialog } from '../components/StockAdjustDialog'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import type { Product } from '../types'

interface Supplier {
  id: string
  name: string
}

export function InventoryPage() {
  const { showToast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [supplierOpen, setSupplierOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [stockOpen, setStockOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [productData, supplierData] = await Promise.all([
        api<Product[]>('/api/products'),
        api<Supplier[]>('/api/suppliers'),
      ])
      setProducts(productData)
      setSuppliers(supplierData)
    } catch {
      showToast('Failed to load inventory.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function saveProduct(payload: { sku: string; name: string; costPrice: number; sellingPrice: number; quantityOnHand: number; reorderLevel: number; supplierId?: string | null; isActive: boolean }) {
    if (selectedProduct && editMode) {
      await api(`/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      showToast('Product updated successfully.', 'success')
    } else {
      await api('/api/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      showToast('Product created successfully.', 'success')
    }

    setEditMode(false)
    await load()
  }

  async function addSupplier(payload: { name: string; contactPerson?: string | null; phone?: string | null }) {
    await api('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    await load()
    showToast('Supplier created successfully.', 'success')
  }

  async function quickAdjust(payload: { type: 'StockIn' | 'StockOut' | 'Adjustment'; quantity: number; notes?: string | null }) {
    if (!selectedProduct) return

    try {
      await api(`/api/inventory/${selectedProduct.id}/transactions`, {
        method: 'POST',
        body: JSON.stringify({ type: payload.type, quantity: payload.quantity, notes: payload.notes }),
      })
      setStockOpen(false)
      await load()
      showToast('Stock adjusted successfully.', 'success')
    } catch {
      showToast('Failed to adjust stock.', 'error')
    }
  }

  async function deleteProduct() {
    if (!selectedProduct) return

    try {
      await api(`/api/products/${selectedProduct.id}`, { method: 'DELETE' })
      setConfirmOpen(false)
      setDetailOpen(false)
      await load()
      showToast('Product deleted successfully.', 'success')
    } catch {
      showToast('Failed to delete product.', 'error')
    }
  }

  return (
    <section>
      <PageHeader
        title="Inventory"
        subtitle="Track products, low-stock alerts, and quick stock adjustments"
        actions={(
          <>
            <button type="button" className="secondary-button" onClick={() => setSupplierOpen(true)}>New Supplier</button>
            <button type="button" onClick={() => { setSelectedProduct(null); setEditMode(false); setFormOpen(true) }}><PackagePlus size={16} /> New Product</button>
          </>
        )}
      />

      <ProductForm
        open={formOpen}
        mode={selectedProduct && editMode ? 'edit' : 'new'}
        suppliers={suppliers}
        initial={selectedProduct && editMode ? {
          sku: selectedProduct.sku,
          name: selectedProduct.name,
          costPrice: selectedProduct.costPrice,
          sellingPrice: selectedProduct.sellingPrice,
          quantityOnHand: selectedProduct.quantityOnHand,
          reorderLevel: selectedProduct.reorderLevel,
          isActive: selectedProduct.isActive,
        } : undefined}
        onClose={() => setFormOpen(false)}
        onSave={saveProduct}
      />

      <SupplierForm open={supplierOpen} mode="new" onClose={() => setSupplierOpen(false)} onSave={addSupplier} />

      <Dialog
        open={detailOpen && !!selectedProduct}
        onClose={() => setDetailOpen(false)}
        title="Product Details"
        size="md"
        actions={(
          <>
            <button type="button" className="secondary-button" onClick={() => setDetailOpen(false)}>Close</button>
            <button type="button" onClick={() => setStockOpen(true)} title="Adjust Stock"><ArrowUpDown size={16} /> Adjust Stock</button>
            <button type="button" onClick={() => { setEditMode(true); setFormOpen(true) }} title="Edit"><Pencil size={16} /> Edit</button>
            <button type="button" className="danger-button" onClick={() => setConfirmOpen(true)} title="Delete"><Trash2 size={16} /> Delete</button>
          </>
        )}
      >
        {selectedProduct ? (
          <div className="form-grid">
            <p><strong>SKU:</strong> {selectedProduct.sku}</p>
            <p><strong>Name:</strong> {selectedProduct.name}</p>
            <p><strong>Current stock level:</strong> {selectedProduct.quantityOnHand}</p>
            <p><strong>Reorder status:</strong> {selectedProduct.quantityOnHand <= selectedProduct.reorderLevel ? 'Low Stock' : 'Normal'}</p>
            <p><strong>Last stock-in date:</strong> N/A</p>
          </div>
        ) : null}
      </Dialog>

      <StockAdjustDialog
        open={stockOpen && !!selectedProduct}
        productName={selectedProduct?.name || ''}
        currentQty={selectedProduct?.quantityOnHand || 0}
        onClose={() => setStockOpen(false)}
        onConfirm={quickAdjust}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Product?"
        message="Stock history will be lost."
        confirmLabel="Delete Product"
        cancelLabel="Keep Product"
        variant="danger"
        onClose={() => setConfirmOpen(false)}
        onConfirm={deleteProduct}
      />
      {loading ? (
        <div className="skeleton-row-grid">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : (
        <DataTable
          headers={['SKU', 'Name', 'Cost', 'Price', 'On Hand', 'Reorder']}
          rows={products.map((p) => [p.sku, p.name, p.costPrice, p.sellingPrice, p.quantityOnHand, p.reorderLevel])}
          onRowClick={(_, row) => {
            const product = products.find((item) => item.sku === String(row[0]))
            if (product) {
              setSelectedProduct(product)
              setDetailOpen(true)
              setEditMode(false)
            }
          }}
        />
      )}
      <div className="toolbar">
        {products.slice(0, 10).map((p) => (
          <div key={p.id} className="quick-stock-row">
            <span>{p.name}</span>
            {p.quantityOnHand <= p.reorderLevel ? <StatusBadge status="LowStock" /> : null}
            <button onClick={() => { setSelectedProduct(p); setStockOpen(true) }}>+/-</button>
          </div>
        ))}
      </div>
    </section>
  )
}
