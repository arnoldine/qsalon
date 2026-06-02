import { FormField } from './FormField'
import { useFocusTrap } from './useFocusTrap'
import type { AppointmentStatus, Customer, Employee, SalonService } from '../types'

interface AppointmentEditDialogProps {
  open: boolean
  title: string
  customerId: string
  employeeId: string
  serviceId: string
  appointmentDate: string
  startTime: string
  endTime: string
  notes: string
  status: AppointmentStatus
  customers: Customer[]
  employees: Employee[]
  services: SalonService[]
  onClose: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
  onCustomerChange: (value: string) => void
  onEmployeeChange: (value: string) => void
  onServiceChange: (value: string) => void
  onDateChange: (value: string) => void
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
  onNotesChange: (value: string) => void
  onStatusChange: (value: AppointmentStatus) => void
}

const statusOptions: AppointmentStatus[] = ['Booked', 'Confirmed', 'InProgress', 'Completed', 'Cancelled', 'NoShow']

export function AppointmentEditDialog(props: AppointmentEditDialogProps) {
  const ref = useFocusTrap<HTMLDivElement>(props.open, props.onClose)

  if (!props.open) {
    return null
  }

  return (
    <div className="modal-overlay">
      <div ref={ref} className="modal-card appointment-edit-dialog" onClick={(event) => event.stopPropagation()} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="appointment-edit-title">
        <header className="modal-header">
          <h3 id="appointment-edit-title">{props.title}</h3>
          <button type="button" onClick={props.onClose} aria-label="Close appointment form">×</button>
        </header>

        <form onSubmit={props.onSubmit} className="modal-body form-grid">
          <FormField label="Customer">
            <select value={props.customerId} onChange={(event) => props.onCustomerChange(event.target.value)} required>
              {props.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.firstName} {customer.lastName}</option>)}
            </select>
          </FormField>

          <FormField label="Employee">
            <select value={props.employeeId} onChange={(event) => props.onEmployeeChange(event.target.value)} required>
              {props.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </select>
          </FormField>

          <FormField label="Service">
            <select value={props.serviceId} onChange={(event) => props.onServiceChange(event.target.value)} required>
              <option value="">Select a service</option>
              {props.services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
            </select>
          </FormField>

          <FormField label="Date"><input type="date" value={props.appointmentDate} onChange={(event) => props.onDateChange(event.target.value)} /></FormField>
          <FormField label="Start"><input type="time" value={props.startTime} onChange={(event) => props.onStartChange(event.target.value)} /></FormField>
          <FormField label="End"><input type="time" value={props.endTime} onChange={(event) => props.onEndChange(event.target.value)} /></FormField>
          <FormField label="Status">
            <select value={props.status} onChange={(event) => props.onStatusChange(event.target.value as AppointmentStatus)}>
              {statusOptions.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </FormField>
          <label className="field">
            <span>Notes</span>
            <textarea rows={4} value={props.notes} onChange={(event) => props.onNotesChange(event.target.value)} />
          </label>

          <footer className="modal-footer">
            <button type="submit">Save Appointment</button>
            <button type="button" className="secondary-button" onClick={props.onClose}>Close</button>
          </footer>
        </form>
      </div>
    </div>
  )
}