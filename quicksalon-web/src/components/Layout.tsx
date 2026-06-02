import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart2,
  Bell,
  Building2,
  CalendarDays,
  GitBranch,
  LayoutDashboard,
  Package,
  Scissors,
  Settings,
  Shield,
  ShoppingCart,
  UserCheck,
  Users,
} from 'lucide-react'
import { AppointmentDetailDialog } from './AppointmentDetailDialog'
import { AppointmentEditDialog } from './AppointmentEditDialog'
import { NotificationPanel } from './NotificationPanel'
import { QuickSalonLogo } from './QuickSalonLogo'
import { ReminderDialog } from './ReminderDialog'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import type {
  AppointmentStatus,
  Customer,
  Employee,
  PendingReminder,
  PagedResult,
  ReminderChannel,
  SalonService,
  TenantSettings,
} from '../types'

const navItems = [
  { label: 'Salon Dashboard', path: '/', icon: LayoutDashboard, roles: [] as string[] },
  { label: 'Customers', path: '/customers', icon: Users, roles: ['Admin', 'Receptionist', 'BranchManager', 'SalonOwner'] },
  { label: 'Appointments', path: '/appointments', icon: CalendarDays, roles: ['Admin', 'Receptionist', 'Stylist', 'Beautician', 'BranchManager', 'SalonOwner'] },
  { label: 'Services', path: '/services', icon: Scissors, roles: ['Admin', 'BranchManager', 'SalonOwner'] },
  { label: 'Staff', path: '/employees', icon: UserCheck, roles: ['Admin', 'BranchManager', 'SalonOwner'] },
  { label: 'POS', path: '/pos', icon: ShoppingCart, roles: ['Admin', 'Cashier', 'Receptionist', 'BranchManager', 'SalonOwner'] },
  { label: 'Inventory', path: '/inventory', icon: Package, roles: ['Admin', 'InventoryOfficer', 'BranchManager', 'SalonOwner'] },
  { label: 'Reports', path: '/reports', icon: BarChart2, roles: ['Admin', 'BranchManager', 'SalonOwner'] },
  { label: 'Settings', path: '/settings', icon: Settings, roles: ['Admin', 'SystemAdmin', 'SalonOwner'] },
  { label: 'Tenants', path: '/tenants', icon: Building2, roles: ['Admin', 'SystemAdmin'] },
  { label: 'Branches', path: '/branches', icon: GitBranch, roles: ['Admin', 'SystemAdmin'] },
  { label: 'Users', path: '/users', icon: Shield, roles: ['Admin', 'SystemAdmin'] },
]

const DEFAULT_TEMPLATE = 'Hi {customerName}, reminder: your {service} appointment is on {date} at {time} with {employeeName} at {salonName}. Reply STOP to opt out.'
const LAST_SEEN_KEY = 'qs_reminders_last_seen'
const DISMISSED_KEY = 'qs_reminders_dismissed'

const emptySettings: TenantSettings = {
  tenantId: '',
  salonName: '',
  logoUrl: '',
  phone: '',
  email: '',
  address: '',
  openingHours: '',
  defaultCurrency: 'GHS',
  taxRate: 0,
  receiptFooter: '',
  enableAppointmentReminders: false,
  reminderSettings: {
    autoReminderEnabled: false,
    leadTime: '2h',
    defaultChannel: 'SMS',
    numberPrefix: '',
    messageTemplate: DEFAULT_TEMPLATE,
  },
}

export function Layout() {
  const { logout, fullName, tenantName, branchName, hasAnyRole } = useAuth()
  const { showToast } = useToast()
  const location = useLocation()

  const [reminders, setReminders] = useState<PendingReminder[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [selectedReminderId, setSelectedReminderId] = useState('')
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]'))
  const [lastSeen, setLastSeen] = useState<number>(() => Number(localStorage.getItem(LAST_SEEN_KEY) ?? '0'))
  const [customers, setCustomers] = useState<Customer[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [services, setServices] = useState<SalonService[]>([])
  const [settings, setSettings] = useState<TenantSettings>(emptySettings)

  const [customerId, setCustomerId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<AppointmentStatus>('Booked')

  const visibleNav = navItems.filter((item) => item.roles.length === 0 || hasAnyRole(...item.roles))

  async function loadReminderData() {
    try {
      const result = await api<PendingReminder[]>('/api/reminders/pending')
      setReminders(result)
    } catch {
      showToast('Failed to load reminders.', 'error')
    }
  }

  async function loadSupportData() {
    try {
      const [cust, staff, serviceList, tenantSettings] = await Promise.all([
        api<PagedResult<Customer>>('/api/customers?page=1&pageSize=100'),
        api<Employee[]>('/api/employees'),
        api<SalonService[]>('/api/services'),
        api<TenantSettings>('/api/settings/tenant'),
      ])
      setCustomers(cust.items)
      setEmployees(staff)
      setServices(serviceList)
      setSettings(tenantSettings)
    } catch {
      showToast('Failed to load appointment references.', 'error')
    }
  }

  useEffect(() => {
    loadReminderData()
    loadSupportData()
    const interval = window.setInterval(() => {
      loadReminderData()
    }, 60000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissedIds))
  }, [dismissedIds])

  function markAllRead() {
    const value = Date.now()
    setLastSeen(value)
    localStorage.setItem(LAST_SEEN_KEY, String(value))
  }

  const visibleReminders = useMemo(
    () => reminders.filter((reminder) => !dismissedIds.includes(reminder.id)),
    [dismissedIds, reminders],
  )

  const unreadIds = useMemo(
    () => new Set(visibleReminders.filter((reminder) => new Date(reminder.triggeredAt).getTime() > lastSeen).map((reminder) => reminder.id)),
    [lastSeen, visibleReminders],
  )

  const selectedReminder = useMemo(
    () => visibleReminders.find((reminder) => reminder.id === selectedReminderId) ?? null,
    [selectedReminderId, visibleReminders],
  )

  function openReminderDetail(reminder: PendingReminder) {
    setSelectedReminderId(reminder.id)
    setDetailOpen(true)
  }

  function openEditDialog() {
    if (!selectedReminder) {
      return
    }

    setCustomerId(selectedReminder.customerId)
    setEmployeeId(selectedReminder.employeeId)
    setServiceId(selectedReminder.serviceId ?? '')
    setAppointmentDate(selectedReminder.appointmentDate)
    setStartTime(selectedReminder.startTime)
    setEndTime(selectedReminder.endTime)
    setNotes(selectedReminder.notes ?? '')
    setStatus(selectedReminder.status as AppointmentStatus)
    setDetailOpen(false)
    setEditOpen(true)
  }

  async function saveAppointment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedReminder) {
      return
    }

    try {
      await api(`/api/appointments/${selectedReminder.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          customerId,
          employeeId,
          serviceId: serviceId || null,
          appointmentDate,
          startTime,
          endTime,
          status,
          notes: notes || null,
        }),
      })
      showToast('Appointment updated successfully.', 'success')
      setEditOpen(false)
      await loadReminderData()
    } catch {
      showToast('Failed to update appointment.', 'error')
    }
  }

  async function updateStatus(action: string, successMessage: string) {
    if (!selectedReminder) return
    try {
      await api(`/api/appointments/${selectedReminder.id}/${action}`, { method: 'POST' })
      showToast(successMessage, 'success')
      setDetailOpen(false)
      await loadReminderData()
    } catch {
      showToast('Failed to update appointment status.', 'error')
    }
  }

  async function sendReminder(payload: { appointmentId: string; channel: ReminderChannel; message: string }) {
    try {
      await api('/api/reminders/send', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      showToast('Reminder queued successfully.', 'success')
      return true
    } catch {
      showToast('Failed to queue reminder.', 'error')
      return false
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><QuickSalonLogo size={32} /> <span>{tenantName}</span></div>
        <div className="branch-pill">{branchName}</div>
        <nav>
          {visibleNav.map(({ label, path, icon: Icon }) => (
            <Link key={path} to={path} className={location.pathname === path ? 'active' : ''}>
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user">{fullName || 'User'}</div>
          <button onClick={logout}>Logout</button>
        </div>
      </aside>
      <main className="content">
        <div className="tenant-context tenant-context-bar">
          <div className="tenant-context-copy">
            <span>Salon: {tenantName}</span>
            <span>Branch: {branchName}</span>
          </div>
          <button type="button" className="notification-bell" onClick={() => setPanelOpen(true)} aria-label="Open notifications">
            <Bell size={18} />
            {visibleReminders.length > 0 ? <span className="notification-badge">{visibleReminders.length}</span> : null}
          </button>
        </div>

        <NotificationPanel
          open={panelOpen}
          reminders={visibleReminders}
          unreadIds={unreadIds}
          onClose={() => setPanelOpen(false)}
          onMarkAllRead={markAllRead}
          onView={openReminderDetail}
          onDismiss={(reminder) => setDismissedIds((current) => [...new Set([...current, reminder.id])])}
        />

        <AppointmentDetailDialog
          open={detailOpen}
          appointment={selectedReminder}
          onClose={() => setDetailOpen(false)}
          onEdit={openEditDialog}
          onSendReminder={() => setReminderOpen(true)}
          onMarkArrived={selectedReminder && hasAnyRole('Admin', 'Receptionist', 'BranchManager', 'SalonOwner') ? () => updateStatus('mark-arrived', 'Appointment marked as arrived.') : undefined}
          onStart={selectedReminder && hasAnyRole('Admin', 'Stylist', 'Beautician', 'BranchManager', 'SalonOwner') ? () => updateStatus('start-service', 'Appointment started.') : undefined}
          onComplete={selectedReminder && hasAnyRole('Admin', 'Stylist', 'Beautician', 'BranchManager', 'SalonOwner') ? () => updateStatus('complete', 'Appointment completed.') : undefined}
          onCancel={selectedReminder && hasAnyRole('Admin', 'Receptionist', 'BranchManager', 'SalonOwner') ? () => updateStatus('cancel', 'Appointment cancelled.') : undefined}
        />

        <AppointmentEditDialog
          open={editOpen}
          title="Edit Appointment"
          customerId={customerId}
          employeeId={employeeId}
          serviceId={serviceId}
          appointmentDate={appointmentDate}
          startTime={startTime}
          endTime={endTime}
          notes={notes}
          status={status}
          customers={customers}
          employees={employees}
          services={services}
          onClose={() => setEditOpen(false)}
          onSubmit={saveAppointment}
          onCustomerChange={setCustomerId}
          onEmployeeChange={setEmployeeId}
          onServiceChange={setServiceId}
          onDateChange={setAppointmentDate}
          onStartChange={setStartTime}
          onEndChange={setEndTime}
          onNotesChange={setNotes}
          onStatusChange={setStatus}
        />

        <ReminderDialog
          open={reminderOpen}
          appointment={selectedReminder}
          salonName={settings.salonName || tenantName}
          defaultChannel={settings.reminderSettings.defaultChannel}
          defaultTemplate={settings.reminderSettings.messageTemplate || DEFAULT_TEMPLATE}
          onClose={() => setReminderOpen(false)}
          onSend={sendReminder}
        />

        <Outlet />
      </main>
    </div>
  )
}
