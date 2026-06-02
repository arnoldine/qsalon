import { BellRing } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { useFocusTrap } from './useFocusTrap'
import type { AppointmentDisplay } from '../types'

interface AppointmentDetailDialogProps {
  open: boolean
  appointment: AppointmentDisplay | null
  onClose: () => void
  onEdit: () => void
  onSendReminder: () => void
  onConfirmStatus?: () => void
  onMarkArrived?: () => void
  onStart?: () => void
  onComplete?: () => void
  onCancel?: () => void
  onNoShow?: () => void
}

export function AppointmentDetailDialog({
  open,
  appointment,
  onClose,
  onEdit,
  onSendReminder,
  onConfirmStatus,
  onMarkArrived,
  onStart,
  onComplete,
  onCancel,
  onNoShow,
}: AppointmentDetailDialogProps) {
  const ref = useFocusTrap<HTMLDivElement>(open, onClose)

  if (!open || !appointment) {
    return null
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div ref={ref} className="modal-card appointment-detail-dialog" onClick={(event) => event.stopPropagation()} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="appointment-detail-title">
        <header className="modal-header">
          <div>
            <h3 id="appointment-detail-title">Appointment Detail</h3>
            <p>{appointment.appointmentNumber}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close appointment detail">×</button>
        </header>

        <div className="modal-body">
          <div className="appointment-detail-grid">
            <div>
              <span className="hint">Customer</span>
              <strong>{appointment.customerName}</strong>
            </div>
            <div>
              <span className="hint">Employee</span>
              <strong>{appointment.employeeName}</strong>
            </div>
            <div>
              <span className="hint">Service</span>
              <strong>{appointment.serviceName}</strong>
            </div>
            <div>
              <span className="hint">Date & Time</span>
              <strong>{appointment.appointmentDate} · {appointment.startTime} - {appointment.endTime}</strong>
            </div>
            <div>
              <span className="hint">Status</span>
              <StatusBadge status={appointment.status as any} />
            </div>
            <div>
              <span className="hint">Notes</span>
              <strong>{appointment.notes || 'No notes'}</strong>
            </div>
          </div>
        </div>

        <footer className="modal-footer appointment-detail-footer">
          <button type="button" className="secondary-button" onClick={onClose}>Close</button>
          <button type="button" className="secondary-button" onClick={onEdit}>Edit</button>
          <button type="button" className="secondary-button icon-button" onClick={onSendReminder}><BellRing size={16} /> Send Reminder</button>
          {onConfirmStatus ? <button type="button" onClick={onConfirmStatus}>Confirm</button> : null}
          {onMarkArrived ? <button type="button" onClick={onMarkArrived}>Mark Arrived</button> : null}
          {onStart ? <button type="button" onClick={onStart}>Start</button> : null}
          {onComplete ? <button type="button" onClick={onComplete}>Complete</button> : null}
          {onCancel ? <button type="button" className="danger-button" onClick={onCancel}>Cancel</button> : null}
          {onNoShow ? <button type="button" className="danger-button" onClick={onNoShow}>No-Show</button> : null}
        </footer>
      </div>
    </div>
  )
}