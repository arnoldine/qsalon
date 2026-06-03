import { Link, Outlet, useLocation } from 'react-router-dom'
import { Building2, GitBranch, LayoutDashboard, LogOut, Shield, Users } from 'lucide-react'
import { QuickSalonLogo } from './QuickSalonLogo'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { label: 'Platform Overview', path: '/superadmin', icon: LayoutDashboard },
  { label: 'Salons', path: '/superadmin/tenants', icon: Building2 },
  { label: 'Branches', path: '/superadmin/branches', icon: GitBranch },
  { label: 'Users', path: '/superadmin/users', icon: Users },
  { label: 'Roles & Access', path: '/superadmin/roles', icon: Shield },
]

export function SuperAdminLayout() {
  const { fullName, logout } = useAuth()
  const location = useLocation()

  return (
    <div className="sa-shell">
      <aside className="sa-sidebar">
        <div className="sa-brand">
          <QuickSalonLogo size={32} />
          <div>
            <div className="sa-brand-name">QuickSalon</div>
            <div className="sa-brand-role">Platform Admin</div>
          </div>
        </div>

        <nav className="sa-nav">
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = path === '/superadmin'
              ? location.pathname === '/superadmin'
              : location.pathname.startsWith(path)
            return (
              <Link key={path} to={path} className={`sa-nav-link${active ? ' active' : ''}`}>
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="sa-sidebar-footer">
          <div className="sa-user">
            <Shield size={14} />
            <span>{fullName}</span>
          </div>
          <button className="sa-logout-btn" onClick={logout}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="sa-content">
        <Outlet />
      </main>
    </div>
  )
}
