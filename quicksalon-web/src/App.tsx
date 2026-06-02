import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useAuth } from './context/AuthContext'
import { AppointmentsPage } from './pages/AppointmentsPage'
import { CustomersPage } from './pages/CustomersPage'
import { DashboardPage } from './pages/DashboardPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { InventoryPage } from './pages/InventoryPage'
import { LoginPage } from './pages/LoginPage'
import { PosPage } from './pages/PosPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ServicesPage } from './pages/ServicesPage'
import { TenantsPage } from './pages/TenantsPage'
import { BranchesPage } from './pages/BranchesPage'
import { UsersPage } from './pages/UsersPage'
import './App.css'

function RequireRoles({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { hasAnyRole } = useAuth()
  return hasAnyRole(...roles) ? children : <Navigate to="/" replace />
}

function ProtectedApp() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="pos" element={<PosPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="tenants" element={<RequireRoles roles={['Admin', 'SystemAdmin']}><TenantsPage /></RequireRoles>} />
        <Route path="branches" element={<RequireRoles roles={['Admin', 'SystemAdmin']}><BranchesPage /></RequireRoles>} />
        <Route path="users" element={<RequireRoles roles={['Admin', 'SystemAdmin']}><UsersPage /></RequireRoles>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  const { token } = useAuth()
  return token ? <ProtectedApp /> : <LoginPage />
}

export default App
