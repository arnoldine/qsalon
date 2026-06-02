import type { AppointmentStatus, EmployeeStatus, InvoiceStatus } from '../types'

type BadgeStatus = AppointmentStatus | InvoiceStatus | EmployeeStatus | 'LowStock' | 'Paid' | 'Pending'

const statusClass: Record<BadgeStatus, string> = {
  Booked: 'badge-booked',
  Confirmed: 'badge-confirmed',
  InProgress: 'badge-progress',
  Completed: 'badge-completed',
  Cancelled: 'badge-cancelled',
  NoShow: 'badge-noshow',
  Draft: 'badge-booked',
  Voided: 'badge-cancelled',
  Active: 'badge-confirmed',
  Inactive: 'badge-cancelled',
  OnLeave: 'badge-noshow',
  LowStock: 'badge-cancelled',
  Paid: 'badge-completed',
  Pending: 'badge-progress',
}

export function StatusBadge({ status }: { status: BadgeStatus }) {
  return <span className={`status-badge ${statusClass[status]}`}>{status}</span>
}
