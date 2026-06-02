import { BellOff, CheckCircle2 } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { useFocusTrap } from './useFocusTrap'
import type { PendingReminder } from '../types'

interface NotificationPanelProps {
  open: boolean
  reminders: PendingReminder[]
  unreadIds: Set<string>
  onClose: () => void
  onMarkAllRead: () => void
  onView: (reminder: PendingReminder) => void
  onDismiss: (reminder: PendingReminder) => void
}

const sections: Array<{ key: PendingReminder['section']; title: string }> = [
  { key: 'NeedsAttention', title: '🔴 Needs Attention' },
  { key: 'TodayUpcoming', title: "🟡 Today's Upcoming" },
  { key: 'TomorrowUpcoming', title: "🟢 Tomorrow's Upcoming" },
]

export function NotificationPanel({ open, reminders, unreadIds, onClose, onMarkAllRead, onView, onDismiss }: NotificationPanelProps) {
  const ref = useFocusTrap<HTMLDivElement>(open, onClose)

  return (
    <div className={`notification-overlay${open ? ' open' : ''}`} onClick={onClose}>
      <aside ref={ref} className={`notification-panel${open ? ' open' : ''}`} onClick={(event) => event.stopPropagation()} tabIndex={-1} aria-hidden={!open}>
        <header className="notification-header">
          <h3>Notifications</h3>
          <div className="notification-header-actions">
            <button type="button" className="link-button" onClick={onMarkAllRead}>Mark all read</button>
            <button type="button" className="icon-close-button" onClick={onClose} aria-label="Close notifications">×</button>
          </div>
        </header>

        <div className="notification-body">
          {reminders.length === 0 ? (
            <div className="notification-empty">
              <CheckCircle2 size={28} />
              <strong>All caught up!</strong>
            </div>
          ) : sections.map((section) => {
            const items = reminders.filter((reminder) => reminder.section === section.key)
            if (items.length === 0) return null

            return (
              <section key={section.key} className="notification-section">
                <h4>{section.title}</h4>
                <div className="notification-list">
                  {items.map((reminder) => (
                    <article key={`${reminder.id}-${reminder.reminderType}`} className={`notification-card${unreadIds.has(reminder.id) ? ' unread' : ''}`}>
                      <div className="notification-card-top">
                        <strong>{reminder.customerName} · {reminder.startTime}</strong>
                        <StatusBadge status={reminder.status as any} />
                      </div>
                      <p>{reminder.employeeName}</p>
                      <p>{reminder.reminderLabel}</p>
                      <div className="notification-actions">
                        <button type="button" className="secondary-button" onClick={() => onView(reminder)}>View</button>
                        <button type="button" className="secondary-button icon-button" onClick={() => onDismiss(reminder)}><BellOff size={14} /> Dismiss</button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </aside>
    </div>
  )
}