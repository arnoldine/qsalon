import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { SuperAdminLayout } from './components/SuperAdminLayout'
import { useAuth } from './context/AuthContext'
import { AppointmentsPage } from './pages/AppointmentsPage'
import { BranchesPage } from './pages/BranchesPage'
import { CustomersPage } from './pages/CustomersPage'
import { DashboardPage } from './pages/DashboardPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { InventoryPage } from './pages/InventoryPage'
import { LoginPage } from './pages/LoginPage'
import { PosPage } from './pages/PosPage'
import { PurchasesPage } from './pages/PurchasesPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ServicesPage } from './pages/ServicesPage'
import { SuperAdminDashboard } from './pages/SuperAdminDashboard'
import { TenantsPage } from './pages/TenantsPage'
import { UsersPage } from './pages/UsersPage'
import './App.css'

/** Guard: redirect if user doesn't have one of the given roles */
function RequireRoles({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { hasAnyRole } = useAuth()
  return hasAnyRole(...roles) ? <>{children}</> : <Navigate to="/" replace />
}

/** Tenant workspace — shown to every non-SystemAdmin authenticated user */
function WorkspaceApp() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="customers" element={
          <RequireRoles roles={['Admin','Receptionist','BranchManager','SalonOwner']}>
            <CustomersPage />
          </RequireRoles>
        } />
        <Route path="appointments" element={
          <RequireRoles roles={['Admin','Receptionist','Stylist','Beautician','BranchManager','SalonOwner']}>
            <AppointmentsPage />
          </RequireRoles>
        } />
        <Route path="services" element={
          <RequireRoles roles={['Admin','BranchManager','SalonOwner']}>
            <ServicesPage />
          </RequireRoles>
        } />
        <Route path="employees" element={
          <RequireRoles roles={['Admin','BranchManager','SalonOwner']}>
            <EmployeesPage />
          </RequireRoles>
        } />
        <Route path="pos" element={
          <RequireRoles roles={['Admin','Cashier','Receptionist','BranchManager','SalonOwner']}>
            <PosPage />
          </RequireRoles>
        } />
        <Route path="inventory" element={
          <RequireRoles roles={['Admin','InventoryOfficer','BranchManager','SalonOwner']}>
            <InventoryPage />
          </RequireRoles>
        } />
        <Route path="purchases" element={
          <RequireRoles roles={['Admin','InventoryOfficer','BranchManager','SalonOwner']}>
            <PurchasesPage />
          </RequireRoles>
        } />
        <Route path="expenses" element={
          <RequireRoles roles={['Admin','Cashier','BranchManager','SalonOwner']}>
            <ExpensesPage />
          </RequireRoles>
        } />
        <Route path="reports" element={
          <RequireRoles roles={['Admin','BranchManager','SalonOwner']}>
            <ReportsPage />
          </RequireRoles>
        } />
        <Route path="settings" element={
          <RequireRoles roles={['Admin','SalonOwner']}>
            <SettingsPage />
          </RequireRoles>
        } />
        <Route path="branches" element={
          <RequireRoles roles={['Admin','SalonOwner']}>
            <BranchesPage />
          </RequireRoles>
        } />
        <Route path="users" element={
          <RequireRoles roles={['Admin','SalonOwner']}>
            <UsersPage />
          </RequireRoles>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

/** SuperAdmin shell — only accessible to SystemAdmin role */
function SuperAdminApp() {
  return (
    <Routes>
      <Route path="/superadmin" element={<SuperAdminLayout />}>
        <Route index element={<SuperAdminDashboard />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="branches" element={<BranchesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="*" element={<Navigate to="/superadmin" replace />} />
      </Route>
      {/* Redirect root to superadmin */}
      <Route path="/" element={<Navigate to="/superadmin" replace />} />
      <Route path="*" element={<Navigate to="/superadmin" replace />} />
    </Routes>
  )
}

function App() {
  const { token, isSuperAdmin } = useAuth()

  if (!token) return <LoginPage />
  return isSuperAdmin ? <SuperAdminApp /> : <WorkspaceApp />
}

export default App
