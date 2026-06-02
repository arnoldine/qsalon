import { useEffect, useState } from 'react'
import { useFocusTrap } from './useFocusTrap'
import type { AppointmentDisplay, ReminderChannel } from '../types'

const channels: ReminderChannel[] = ['SMS', 'WhatsApp', 'Email']

interface ReminderDialogProps {
  open: boolean
  appointment: AppointmentDisplay | null
  salonName: string
  defaultChannel: ReminderChannel
  defaultTemplate: string
  onClose: () => void
  onSend: (payload: { appointmentId: string; channel: ReminderChannel; message: string }) => Promise<boolean>
}

function applyTemplate(template: string, appointment: AppointmentDisplay, salonName: string) {
  return template
    .replaceAll('{customerName}', appointment.customerName)
    .replaceAll('{service}', appointment.serviceName)
    .replaceAll('{date}', appointment.appointmentDate)
    .replaceAll('{time}', appointment.startTime)
    .replaceAll('{employeeName}', appointment.employeeName)
    .replaceAll('{salonName}', salonName)
}

export function ReminderDialog({ open, appointment, salonName, defaultChannel, defaultTemplate, onClose, onSend }: ReminderDialogProps) {
  const ref = useFocusTrap<HTMLDivElement>(open, onClose)
  const [channel, setChannel] = useState<ReminderChannel>(defaultChannel || 'SMS')
  const [message, setMessage] = useState('')
  const [queued, setQueued] = useState(false)

  useEffect(() => {
    if (!appointment || !open) {
      return
    }

    setChannel(defaultChannel || 'SMS')
    setMessage(applyTemplate(defaultTemplate, appointment, salonName))
    setQueued(false)
  }, [appointment, defaultChannel, defaultTemplate, open, salonName])

  if (!open || !appointment) {
    return null
  }

  async function handleSend() {
    if (!appointment) {
      return
    }

    const success = await onSend({ appointmentId: appointment.id, channel, message })
    setQueued(success)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div ref={ref} className="modal-card reminder-dialog" onClick={(event) => event.stopPropagation()} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="reminder-dialog-title">
        <header className="modal-header">
          <div>
            <h3 id="reminder-dialog-title">Send Appointment Reminder</h3>
            <p>{appointment.customerName} · {appointment.serviceName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close reminder dialog">×</button>
        </header>

        <div className="modal-body form-grid">
          <div className="state-block">
            <p><strong>Customer:</strong> {appointment.customerName}</p>
            <p><strong>Date/Time:</strong> {appointment.appointmentDate} at {appointment.startTime}</p>
            <p><strong>Service:</strong> {appointment.serviceName}</p>
          </div>

          <div className="reminder-channel-row">
            {channels.map((value) => (
              <label key={value} className="reminder-channel-option">
                <input type="radio" name="reminder-channel" checked={channel === value} onChange={() => setChannel(value)} />
                <span>{value}</span>
              </label>
            ))}
          </div>

          <label className="field">
            <span>Message Preview</span>
            <textarea rows={6} value={message} onChange={(event) => setMessage(event.target.value)} />
          </label>

          {queued ? <p className="success-inline">✓ Reminder queued</p> : null}
        </div>

        <footer className="modal-footer">
          <button type="button" onClick={handleSend}>Send Reminder</button>
          <button type="button" className="secondary-button" onClick={onClose}>Close</button>
        </footer>
      </div>
    </div>
  )
}