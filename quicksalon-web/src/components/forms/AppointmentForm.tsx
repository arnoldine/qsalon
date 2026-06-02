import { useEffect, useState } from 'react'
import { Dialog } from '../Dialog'
import { FormField } from '../FormField'
import { FormFooter } from './FormFooter'
import type { AppointmentStatus, Customer, Employee, SalonService } from '../../types'

interface AppointmentPayload {
  customerId: string
  employeeId: string
  serviceId: string
  appointmentDate: string
  startTime: string
  endTime: string
  status: AppointmentStatus
  notes?: string | null
}

interface AppointmentFormProps {
  open: boolean
  mode: 'new' | 'edit'
  customers: Customer[]
  employees: Employee[]
  services: SalonService[]
  initial?: Partial<AppointmentPayload>
  onClose: () => void
  onSave: (payload: AppointmentPayload) => Promise<void>
}

const statusOptions: AppointmentStatus[] = ['Booked', 'Confirmed', 'InProgress', 'Completed', 'Cancelled', 'NoShow']

export function AppointmentForm({ open, mode, customers, employees, services, initial, onClose, onSave }: AppointmentFormProps) {
  const [customerId, setCustomerId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [status, setStatus] = useState<AppointmentStatus>('Booked')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setCustomerId(initial?.customerId ?? customers[0]?.id ?? '')
    setEmployeeId(initial?.employeeId ?? employees[0]?.id ?? '')
    setServiceId(initial?.serviceId ?? services[0]?.id ?? '')
    setAppointmentDate(initial?.appointmentDate ?? new Date().toISOString().slice(0, 10))
    setStartTime(initial?.startTime ?? '09:00')
    setEndTime(initial?.endTime ?? '10:00')
    setStatus(initial?.status ?? 'Booked')
    setNotes(initial?.notes ?? '')
    setShowErrors(false)
    setError('')
  }, [open, initial, customers, employees, services])

  const missing = {
    customerId: !customerId,
    employeeId: !employeeId,
    serviceId: !serviceId,
    appointmentDate: !appointmentDate,
    startTime: !startTime,
    endTime: !endTime,
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setShowErrors(true)
    if (Object.values(missing).some(Boolean)) return

    setSaving(true)
    setError('')
    try {
      await onSave({ customerId, employeeId, serviceId, appointmentDate, startTime, endTime, status, notes: notes.trim() || null })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save appointment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} closeOnOverlay={false} title={`${mode === 'new' ? 'New' : 'Edit'} Appointment`} size="lg" actions={<FormFooter saving={saving} saveLabel="Save" onCancel={onClose} formId="appointment-form" />}>
      <form id="appointment-form" onSubmit={handleSubmit} className="form-grid">
        <FormField label="Customer"><select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={showErrors && missing.customerId ? 'input-invalid' : ''}>{customers.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}</select></FormField>
        <FormField label="Employee"><select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={showErrors && missing.employeeId ? 'input-invalid' : ''}>{employees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField>
        <FormField label="Service"><select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={showErrors && missing.serviceId ? 'input-invalid' : ''}>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField>
        <FormField label="Date"><input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} className={showErrors && missing.appointmentDate ? 'input-invalid' : ''} /></FormField>
        <FormField label="Start"><input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={showErrors && missing.startTime ? 'input-invalid' : ''} /></FormField>
        <FormField label="End"><input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={showErrors && missing.endTime ? 'input-invalid' : ''} /></FormField>
        <FormField label="Status"><select value={status} onChange={(e) => setStatus(e.target.value as AppointmentStatus)}>{statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></FormField>
        <label className="field"><span>Notes</span><textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        {error ? <p className="error">{error}</p> : null}
      </form>
    </Dialog>
  )
}
