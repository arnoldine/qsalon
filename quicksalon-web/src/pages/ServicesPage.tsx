import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { ServiceForm } from '../components/forms/ServiceForm'
import { FormField } from '../components/FormField'
import { PageHeader } from '../components/PageHeader'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import type { SalonService, ServiceCategory } from '../types'

export function ServicesPage() {
  const { showToast } = useToast()
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [services, setServices] = useState<SalonService[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedService, setSelectedService] = useState<SalonService | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [catName, setCatName] = useState('')

  async function load() {
    try {
      const [cats, svc] = await Promise.all([
        api<ServiceCategory[]>('/api/service-categories'),
        api<SalonService[]>('/api/services'),
      ])

      setCategories(cats)
      setServices(svc)
    } catch {
      showToast('Failed to load services data.', 'error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function createCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await api('/api/service-categories', { method: 'POST', body: JSON.stringify({ name: catName, isActive: true }) })
      setCatName('')
      await load()
      showToast('Category created successfully.', 'success')
    } catch {
      showToast('Failed to create category.', 'error')
    }
  }

  async function saveService(payload: { name: string; categoryId: string; durationMinutes: number; price: number; isActive: boolean }) {
    if (selectedService && editMode) {
      await api(`/api/services/${selectedService.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      showToast('Service updated successfully.', 'success')
    } else {
      await api('/api/services', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      showToast('Service created successfully.', 'success')
    }
    setEditMode(false)
    await load()
  }

  async function deleteService() {
    if (!selectedService) return

    try {
      await api(`/api/services/${selectedService.id}`, { method: 'DELETE' })
      setConfirmOpen(false)
      showToast('Service deleted successfully.', 'success')
      await load()
    } catch {
      showToast('Failed to delete service.', 'error')
    }
  }

  return (
    <section>
      <PageHeader title="Services" subtitle="Manage service catalog and categories" actions={<button onClick={() => { setSelectedService(null); setEditMode(false); setFormOpen(true) }}><Plus size={16} /> New Service</button>} />

      <div className="panel form-grid" style={{ marginBottom: '1rem' }}>
        <h3>Create Category</h3>
        <form onSubmit={createCategory} className="toolbar">
          <FormField label="Name"><input value={catName} onChange={(e) => setCatName(e.target.value)} required /></FormField>
          <button type="submit"><Plus size={16} /> Add Category</button>
        </form>
      </div>

      <ServiceForm
        open={formOpen}
        mode={selectedService && editMode ? 'edit' : 'new'}
        categories={categories}
        initial={selectedService && editMode ? {
          name: selectedService.name,
          categoryId: selectedService.categoryId,
          durationMinutes: selectedService.durationMinutes,
          price: selectedService.price,
          isActive: selectedService.isActive,
        } : undefined}
        onClose={() => setFormOpen(false)}
        onSave={saveService}
      />

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Service?"
        message="Appointments using this service will be unaffected."
        confirmLabel="Delete Service"
        cancelLabel="Keep Service"
        variant="danger"
        onConfirm={deleteService}
        onClose={() => setConfirmOpen(false)}
      />

      <DataTable headers={['Name', 'Duration', 'Price']} rows={services.map((s) => [s.name, s.durationMinutes, s.price])} />
      <div className="toolbar">
        {services.map((service) => (
          <div key={service.id} className="toolbar">
            <button type="button" onClick={() => { setSelectedService(service); setEditMode(true); setFormOpen(true) }}>Edit {service.name}</button>
            <button type="button" className="danger-button" onClick={() => { setSelectedService(service); setConfirmOpen(true) }}>Delete {service.name}</button>
          </div>
        ))}
      </div>
    </section>
  )
}
