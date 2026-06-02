import { useMemo, useState } from 'react'
import { Dialog } from './Dialog'
import type { AppointmentDisplay } from '../types'

type StatusAction = 'Confirm' | 'Start' | 'Complete' | 'Cancel' | 'NoShow'

interface AppointmentStatusDialogProps {
  open: boolean
  action: StatusAction
  appointment: AppointmentDisplay | null
  noShowCount: number
  onClose: () => void
  onConfirm: (meta?: { note?: string; reason?: string }) => Promise<void>
}

const cancelReasons = ['Client Request', 'No Show', 'Staff Unavailable', 'Other']

export function AppointmentStatusDialog({ open, action, appointment, noShowCount, onClose, onConfirm }: AppointmentStatusDialogProps) {
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const title = useMemo(() => {
    switch (action) {
      case 'Complete': return 'Complete appointment?'
      case 'Cancel': return 'Cancel Appointment?'
      case 'NoShow': return 'Mark as No-Show?'
      case 'Start': return 'Start appointment?'
      default: return 'Confirm appointment?'
    }
  }, [action])

  async function submit() {
    if (action === 'Cancel' && !reason) {
      setError('Reason is required for cancellation.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onConfirm({ note: note.trim() || undefined, reason: reason || undefined })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update appointment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      variant={action === 'Cancel' ? 'danger' : 'default'}
      actions={(
        <>
          <button type="button" className="secondary-button" onClick={onClose}>Go Back</button>
          <button type="button" className={action === 'Cancel' ? 'danger-button' : ''} onClick={() => void submit()} disabled={saving}>
            {saving ? <span className="inline-spinner" aria-label="Saving" /> : 'Confirm'}
          </button>
        </>
      )}
    >
      <div className="form-grid">
        {appointment ? <p className="hint">{appointment.customerName} - {appointment.appointmentDate} at {appointment.startTime}</p> : null}
        {action === 'Complete' ? (
          <label className="field">
            <span>Add a note (optional)</span>
            <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        ) : null}

        {action === 'Cancel' ? (
          <label className="field">
            <span>Reason</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className={!reason && error ? 'input-invalid' : ''}>
              <option value="">Select reason</option>
              {cancelReasons.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        ) : null}

        {action === 'NoShow' ? <p>This customer has {noShowCount} previous no-shows.</p> : null}
        {action === 'Cancel' ? <p>This cannot be undone.</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </div>
    </Dialog>
  )
}
