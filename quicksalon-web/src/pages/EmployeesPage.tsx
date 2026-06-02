import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { DataTable } from '../components/DataTable'
import { Dialog } from '../components/Dialog'
import { EmployeeForm } from '../components/forms/EmployeeForm'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../context/ToastContext'
import { api } from '../lib/api'
import { formatMoney } from '../lib/money'
import type { Appointment, Employee } from '../types'

export function EmployeesPage() {
  const { showToast } = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [monthlyCommissions, setMonthlyCommissions] = useState<Array<{ employee: string; commissionAmount: number }>>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  async function load() {
    try {
      const [employeeData, appointmentData, commissionData] = await Promise.all([
        api<Employee[]>('/api/employees'),
        api<Appointment[]>('/api/appointments'),
        api<Array<{ employee: string; commissionAmount: number }>>('/api/commissions?period=monthly'),
      ])
      setEmployees(employeeData)
      setAppointments(appointmentData)
      setMonthlyCommissions(commissionData)
    } catch {
      showToast('Failed to load employees.', 'error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function saveEmployee(payload: { name: string; role: string; phone?: string | null; commissionRate: number; status: string }) {
    if (selectedEmployee && editMode) {
      await api(`/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      showToast('Employee updated successfully.', 'success')
    } else {
      await api('/api/employees', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      showToast('Employee created successfully.', 'success')
    }
    setEditMode(false)
    await load()
  }

  async function deactivateEmployee() {
    if (!selectedEmployee) return

    try {
      await api(`/api/employees/${selectedEmployee.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: selectedEmployee.name,
          role: selectedEmployee.role,
          phone: selectedEmployee.phone,
          commissionRate: selectedEmployee.commissionRate,
          status: 'Inactive',
        }),
      })
      setConfirmOpen(false)
      setDetailOpen(false)
      await load()
      showToast('Employee deactivated successfully.', 'success')
    } catch {
      showToast('Failed to deactivate employee.', 'error')
    }
  }

  function upcomingCount(employeeId: string) {
    const today = new Date().toISOString().slice(0, 10)
    return appointments.filter((item) => item.employeeId === employeeId && item.appointmentDate >= today && item.status !== 'Cancelled').length
  }

  function commissionForEmployee(name: string) {
    return monthlyCommissions.find((item) => item.employee === name)?.commissionAmount ?? 0
  }

  return (
    <section>
      <PageHeader title="Staff" subtitle="Employee directory and commission setup" actions={<button onClick={() => { setSelectedEmployee(null); setEditMode(false); setFormOpen(true) }}>New Employee</button>} />

      <EmployeeForm
        open={formOpen}
        mode={selectedEmployee && editMode ? 'edit' : 'new'}
        initial={selectedEmployee && editMode ? {
          name: selectedEmployee.name,
          role: selectedEmployee.role,
          phone: selectedEmployee.phone,
          commissionRate: selectedEmployee.commissionRate,
          status: selectedEmployee.status,
        } : undefined}
        onClose={() => setFormOpen(false)}
        onSave={saveEmployee}
      />

      <Dialog
        open={detailOpen && !!selectedEmployee}
        onClose={() => setDetailOpen(false)}
        title="Employee Details"
        size="md"
        actions={(
          <>
            <button type="button" className="secondary-button" onClick={() => setDetailOpen(false)}>Close</button>
            <button type="button" onClick={() => { setEditMode(true); setFormOpen(true) }}>Edit</button>
            <button type="button" className="danger-button" onClick={() => setConfirmOpen(true)}>Deactivate</button>
          </>
        )}
      >
        {selectedEmployee ? (
          <div className="form-grid">
            <p><strong>Name:</strong> {selectedEmployee.name}</p>
            <p><strong>Role:</strong> {selectedEmployee.role}</p>
            <p><strong>Phone:</strong> {selectedEmployee.phone || 'N/A'}</p>
            <p><strong>Status:</strong> {selectedEmployee.status}</p>
            <p><strong>Upcoming appointments count:</strong> {upcomingCount(selectedEmployee.id)}</p>
            <p><strong>Commission earned this month:</strong> {formatMoney(commissionForEmployee(selectedEmployee.name))}</p>
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title={`Deactivate ${selectedEmployee?.name || 'employee'}?`}
        message="They will no longer appear in booking."
        confirmLabel="Deactivate"
        cancelLabel="Keep Active"
        variant="danger"
        onConfirm={deactivateEmployee}
        onClose={() => setConfirmOpen(false)}
      />

      <DataTable
        headers={['Name', 'Role', 'Phone', 'Commission', 'Status']}
        rows={employees.map((e) => [e.name, e.role, e.phone, `${e.commissionRate}%`, e.status])}
        onRowClick={(_, row) => {
          const employee = employees.find((item) => item.name === String(row[0]))
          if (employee) {
            setSelectedEmployee(employee)
            setDetailOpen(true)
            setEditMode(false)
          }
        }}
      />
      <div className="toolbar">
        {employees.map((e) => (
          <div key={e.id}><StatusBadge status={e.status as any} /></div>
        ))}
      </div>
    </section>
  )
}
