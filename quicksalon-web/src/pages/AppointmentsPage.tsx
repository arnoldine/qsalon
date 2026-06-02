import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ClipboardList } from 'lucide-react'
import { AppointmentCalendar } from '../components/AppointmentCalendar'
import { AppointmentDetailDialog } from '../components/AppointmentDetailDialog'
import { AppointmentStatusDialog } from '../components/AppointmentStatusDialog'
import { AppointmentForm } from '../components/forms/AppointmentForm'
import { PageHeader } from '../components/PageHeader'
import { ReminderDialog } from '../components/ReminderDialog'
import { SkeletonRow } from '../components/Skeleton'
import { StatusBadge } from '../components/StatusBadge'
import { EmptyState } from '../components/StateBlocks'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import type {
  Appointment,
  AppointmentDisplay,
  AppointmentStatus,
  Customer,
  Employee,
  PagedResult,
  ReminderChannel,
  SalonService,
  TenantSettings,
} from '../types'

type AppointmentView = 'List' | 'Calendar'

const DEFAULT_TEMPLATE = 'Hi {customerName}, reminder: your {service} appointment is on {date} at {time} with {employeeName} at {salonName}. Reply STOP to opt out.'

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

function normalizeSettings(input: TenantSettings): TenantSettings {
  return {
    ...input,
    reminderSettings: {
      autoReminderEnabled: input.reminderSettings?.autoReminderEnabled ?? false,
      leadTime: input.reminderSettings?.leadTime || '2h',
      defaultChannel: input.reminderSettings?.defaultChannel || 'SMS',
      numberPrefix: input.reminderSettings?.numberPrefix ?? '',
      messageTemplate: input.reminderSettings?.messageTemplate || DEFAULT_TEMPLATE,
    },
  }
}

function startOfWeek(date: Date) {
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  next.setDate(next.getDate() + diff)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatWeekRange(weekStart: Date) {
  const weekEnd = addDays(weekStart, 6)
  const startLabel = weekStart.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  const endLabel = weekEnd.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  return `${startLabel} – ${endLabel}`
}

const storedView = localStorage.getItem('qs_appt_view') as AppointmentView | null
const defaultView: AppointmentView = storedView ?? 'Calendar'

export function AppointmentsPage() {
  const { hasAnyRole, tenantName } = useAuth()
  const { showToast } = useToast()

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [services, setServices] = useState<SalonService[]>([])
  const [settings, setSettings] = useState<TenantSettings>(emptySettings)
  const [loading, setLoading] = useState(true)

  const [view, setView] = useState<AppointmentView>(defaultView)
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()))

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'new' | 'edit'>('new')
  const [detailOpen, setDetailOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusAction, setStatusDialogAction] = useState<'Confirm' | 'Start' | 'Complete' | 'Cancel' | 'NoShow'>('Confirm')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('')

  useEffect(() => {
    localStorage.setItem('qs_appt_view', view)
  }, [view])

  async function load() {
    setLoading(true)
    try {
      const [apps, cust, staff, serviceList, tenantSettings] = await Promise.all([
        api<Appointment[]>('/api/appointments'),
        api<PagedResult<Customer>>('/api/customers?page=1&pageSize=100'),
        api<Employee[]>('/api/employees'),
        api<SalonService[]>('/api/services'),
        api<TenantSettings>('/api/settings/tenant'),
      ])

      setAppointments(apps)
      setCustomers(cust.items)
      setEmployees(staff)
      setServices(serviceList)
      setSettings(normalizeSettings(tenantSettings))
    } catch {
      showToast('Failed to load appointments data.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const displayAppointments = useMemo<AppointmentDisplay[]>(() => {
    const customerMap = new Map(customers.map((customer) => [customer.id, `${customer.firstName} ${customer.lastName}`]))
    const employeeMap = new Map(employees.map((employee) => [employee.id, employee.name]))
    const serviceMap = new Map(services.map((service) => [service.id, service.name]))

    return appointments
      .map((appointment) => ({
        id: appointment.id,
        appointmentNumber: appointment.appointmentNumber,
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        notes: appointment.notes,
        customerId: appointment.customerId,
        customerName: customerMap.get(appointment.customerId) ?? 'Unknown Customer',
        employeeId: appointment.employeeId,
        employeeName: employeeMap.get(appointment.employeeId) ?? 'Unknown Employee',
        serviceId: appointment.serviceId,
        serviceName: appointment.serviceId ? (serviceMap.get(appointment.serviceId) ?? 'General Service') : 'General Service',
      }))
      .sort((left, right) => `${left.appointmentDate}${left.startTime}`.localeCompare(`${right.appointmentDate}${right.startTime}`))
  }, [appointments, customers, employees, services])

  const selectedAppointment = useMemo(
    () => displayAppointments.find((appointment) => appointment.id === selectedAppointmentId) ?? null,
    [displayAppointments, selectedAppointmentId],
  )

  function openCreateDialog() {
    setEditingId(null)
    setFormMode('new')
    setFormOpen(true)
  }

  function openDetailDialog(appointment: AppointmentDisplay) {
    setSelectedAppointmentId(appointment.id)
    setDetailOpen(true)
  }

  function openEditDialog(appointment: AppointmentDisplay) {
    setEditingId(appointment.id)
    setSelectedAppointmentId(appointment.id)
    setFormMode('edit')
    setDetailOpen(false)
    setFormOpen(true)
  }

  async function saveAppointment(payload: {
    customerId: string
    employeeId: string
    serviceId: string
    appointmentDate: string
    startTime: string
    endTime: string
    status: AppointmentStatus
    notes?: string | null
  }) {
    const request = {
      ...payload,
      serviceId: payload.serviceId || null,
      notes: payload.notes || null,
    }

    try {
      if (editingId) {
        await api(`/api/appointments/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(request),
        })
        showToast('Appointment updated successfully.', 'success')
      } else {
        await api('/api/appointments', {
          method: 'POST',
          body: JSON.stringify(request),
        })
        showToast('Appointment created successfully.', 'success')
      }

      setEditingId(null)
      setFormOpen(false)
      await load()
    } catch {
      throw new Error(editingId ? 'Failed to update appointment.' : 'Failed to create appointment.')
    }
  }

  async function setStatusAction(id: string, action: string, message: string) {
    try {
      await api(`/api/appointments/${id}/${action}`, { method: 'POST' })
      showToast(message, 'success')
      setDetailOpen(false)
      await load()
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

  const selectedAppointmentForForm = useMemo(
    () => displayAppointments.find((appointment) => appointment.id === editingId) ?? null,
    [displayAppointments, editingId],
  )

  const noShowCount = useMemo(() => {
    if (!selectedAppointment) return 0
    return appointments.filter((appointment) =>
      appointment.customerId === selectedAppointment.customerId &&
      appointment.status === 'NoShow' &&
      appointment.id !== selectedAppointment.id,
    ).length
  }, [appointments, selectedAppointment])

  async function confirmStatusTransition() {
    if (!selectedAppointment) return

    if (statusAction === 'Confirm') {
      await setStatusAction(selectedAppointment.id, 'status?status=Confirmed', 'Appointment confirmed.')
    }
    if (statusAction === 'Start') {
      await setStatusAction(selectedAppointment.id, 'start-service', 'Appointment started.')
    }
    if (statusAction === 'Complete') {
      await setStatusAction(selectedAppointment.id, 'complete', 'Appointment completed.')
    }
    if (statusAction === 'Cancel') {
      await setStatusAction(selectedAppointment.id, 'cancel', 'Appointment cancelled.')
    }
    if (statusAction === 'NoShow') {
      await setStatusAction(selectedAppointment.id, 'no-show', 'Appointment marked as no-show.')
    }

    setStatusDialogOpen(false)
  }

  return (
    <section>
      <PageHeader
        title="Appointments"
        subtitle="Weekly calendar and appointment workflow"
        actions={(
          <>
            <div className="segmented-toggle" role="tablist" aria-label="Appointment view toggle">
              <button type="button" className={view === 'List' ? 'active' : ''} onClick={() => setView('List')}><ClipboardList size={16} /> List</button>
              <button type="button" className={view === 'Calendar' ? 'active' : ''} onClick={() => setView('Calendar')}><CalendarDays size={16} /> Calendar</button>
            </div>
            <button type="button" onClick={openCreateDialog}>New Appointment</button>
          </>
        )}
      />

      {view === 'Calendar' ? (
        <div className="panel calendar-toolbar">
          <div className="toolbar">
            <button type="button" onClick={() => setWeekStart((current) => addDays(current, -7))}>← Prev Week</button>
            <button type="button" className="secondary-button" onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</button>
            <button type="button" onClick={() => setWeekStart((current) => addDays(current, 7))}>Next Week →</button>
          </div>
          <strong>{formatWeekRange(weekStart)}</strong>
        </div>
      ) : null}

      <AppointmentForm
        open={formOpen}
        mode={formMode}
        customers={customers}
        employees={employees}
        services={services}
        initial={selectedAppointmentForForm ? {
          customerId: selectedAppointmentForForm.customerId,
          employeeId: selectedAppointmentForForm.employeeId,
          serviceId: selectedAppointmentForForm.serviceId ?? '',
          appointmentDate: selectedAppointmentForForm.appointmentDate,
          startTime: selectedAppointmentForForm.startTime,
          endTime: selectedAppointmentForForm.endTime,
          status: selectedAppointmentForForm.status as AppointmentStatus,
          notes: selectedAppointmentForForm.notes ?? '',
        } : undefined}
        onClose={() => setFormOpen(false)}
        onSave={saveAppointment}
      />

      <AppointmentDetailDialog
  open={detailOpen}
        appointment={selectedAppointment}
        onClose={() => setDetailOpen(false)}
        onEdit={() => selectedAppointment ? openEditDialog(selectedAppointment) : undefined}
        onSendReminder={() => setReminderOpen(true)}
        onConfirmStatus={selectedAppointment && hasAnyRole('Admin', 'Receptionist', 'BranchManager', 'SalonOwner') ? () => { setStatusDialogAction('Confirm'); setStatusDialogOpen(true) } : undefined}
        onMarkArrived={selectedAppointment && hasAnyRole('Admin', 'Receptionist', 'BranchManager', 'SalonOwner') ? () => setStatusAction(selectedAppointment.id, 'mark-arrived', 'Appointment marked as arrived.') : undefined}
        onStart={selectedAppointment && hasAnyRole('Admin', 'Stylist', 'Beautician', 'BranchManager', 'SalonOwner') ? () => { setStatusDialogAction('Start'); setStatusDialogOpen(true) } : undefined}
        onComplete={selectedAppointment && hasAnyRole('Admin', 'Stylist', 'Beautician', 'BranchManager', 'SalonOwner') ? () => { setStatusDialogAction('Complete'); setStatusDialogOpen(true) } : undefined}
        onCancel={selectedAppointment && hasAnyRole('Admin', 'Receptionist', 'BranchManager', 'SalonOwner') ? () => { setStatusDialogAction('Cancel'); setStatusDialogOpen(true) } : undefined}
        onNoShow={selectedAppointment && hasAnyRole('Admin', 'Receptionist', 'BranchManager', 'SalonOwner') ? () => { setStatusDialogAction('NoShow'); setStatusDialogOpen(true) } : undefined}
      />

      <AppointmentStatusDialog
        open={statusDialogOpen}
        action={statusAction}
        appointment={selectedAppointment}
        noShowCount={noShowCount}
        onClose={() => setStatusDialogOpen(false)}
        onConfirm={confirmStatusTransition}
      />

      <ReminderDialog
        open={reminderOpen}
        appointment={selectedAppointment}
        salonName={settings.salonName || tenantName}
        defaultChannel={settings.reminderSettings.defaultChannel || 'SMS'}
        defaultTemplate={settings.reminderSettings.messageTemplate || DEFAULT_TEMPLATE}
        onClose={() => setReminderOpen(false)}
        onSend={sendReminder}
      />

      {loading ? (
        <div className="skeleton-row-grid">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : displayAppointments.length === 0 ? (
        <EmptyState title="No appointments" description="Create an appointment to populate the weekly schedule." />
      ) : view === 'List' ? (
        <div className="panel">
          <div className="appointments-list">
            {displayAppointments.map((appointment) => (
              <article key={appointment.id} className="appointment-card">
                <div className="appointment-main">
                  <strong>{appointment.appointmentNumber}</strong>
                  <span>{appointment.appointmentDate} {appointment.startTime} - {appointment.endTime}</span>
                </div>
                <div className="appointment-detail-grid compact">
                  <span>{appointment.customerName}</span>
                  <span>{appointment.employeeName}</span>
                  <span>{appointment.serviceName}</span>
                </div>
                <StatusBadge status={appointment.status as any} />
                <div className="appointment-actions">
                  <button type="button" onClick={() => openDetailDialog(appointment)}>View</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <AppointmentCalendar weekStart={weekStart} appointments={displayAppointments} onSelectAppointment={openDetailDialog} />
      )}
    </section>
  )
}
