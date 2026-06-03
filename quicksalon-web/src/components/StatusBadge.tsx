import type { AppointmentStatus, EmployeeStatus, InvoiceStatus, PurchaseStatus } from '../types'

type BadgeStatus = AppointmentStatus | InvoiceStatus | EmployeeStatus | PurchaseStatus | 'LowStock' | 'Paid' | 'Pending'

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
  Received: 'badge-completed',
}

export function StatusBadge({ status, label }: { status: BadgeStatus; label?: string }) {
  return <span className={`status-badge ${statusClass[status] ?? 'badge-booked'}`}>{label ?? status}</span>
}
