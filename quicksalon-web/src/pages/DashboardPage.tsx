import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays, Clock, DollarSign, UserCheck, Users,
  PlusCircle, UserPlus, Package, TrendingDown, RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Cell,
} from 'recharts'
import { PageHeader } from '../components/PageHeader'
import { SkeletonCard } from '../components/Skeleton'
import { EmptyState, ErrorState } from '../components/StateBlocks'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../context/ToastContext'
import { StatCard } from '../components/StatCard'
import { api } from '../lib/api'
import { formatMoney } from '../lib/money'
import type { DashboardKpis, AppointmentDisplay } from '../types'

interface RevenueTrendPoint { date: string; revenue: number }

type Period = 'today' | 'week' | 'month'

const PERIOD_LABELS: Record<Period, string> = { today: 'Today', week: 'This Week', month: 'This Month' }

const BAR_COLORS = ['#C4622D', '#E07B4A', '#F0A07C', '#F8C4A8', '#FDE0D0']

export function DashboardPage() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardKpis | null>(null)
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>([])
  const [recentAppointments, setRecentAppointments] = useState<AppointmentDisplay[]>([])
  const [showRevenueChart, setShowRevenueChart] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState<Period>('today')

  async function loadDashboard(silent = false) {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setError('')

    try {
      const kpis = await api<DashboardKpis>('/api/dashboard/kpis')
      setData(kpis)
    } catch {
      setError('Unable to load dashboard right now.')
      if (!silent) showToast('Unable to load dashboard.', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }

    // Revenue trend (best-effort)
    try {
      const trend = await api<{ data: RevenueTrendPoint[] }>('/api/dashboard/revenue-trend')
      setRevenueTrend(trend.data ?? [])
      setShowRevenueChart((trend.data ?? []).length > 0)
    } catch { setShowRevenueChart(false) }

    // Recent appointments (best-effort)
    try {
      const appts = await api<AppointmentDisplay[]>('/api/appointments')
      setRecentAppointments((appts ?? []).slice(0, 6))
    } catch { /* non-critical */ }
  }

  useEffect(() => { loadDashboard() }, [])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const timer = setInterval(() => loadDashboard(true), 60_000)
    return () => clearInterval(timer)
  }, [])

  if (loading) return (
    <section>
      <PageHeader title="Dashboard" subtitle="Loading..." />
      <div className="stats-grid">{[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}</div>
    </section>
  )

  if (error) return <ErrorState message={error} />
  if (!data) return <EmptyState title="No dashboard data" description="Create appointments and invoices to populate KPIs." />

  const topServicesForChart = (data.topServices ?? []).map((s, i) => ({
    name: s.service?.length > 16 ? s.service.slice(0, 14) + '…' : s.service,
    revenue: s.revenue,
    fill: BAR_COLORS[i % BAR_COLORS.length],
  }))

  const topEmployeesForChart = (data.topEmployees ?? []).map((e, i) => ({
    name: e.name?.split(' ')[0] ?? 'Staff',
    commission: e.commission,
    fill: BAR_COLORS[i % BAR_COLORS.length],
  }))

  return (
    <section>
      <div className="dashboard-header">
        <PageHeader
          title="Dashboard"
          subtitle="Live overview of your salon operations"
        />
        <div className="dashboard-controls">
          {/* Period selector */}
          <div className="period-tabs">
            {(['today','week','month'] as Period[]).map(p => (
              <button
                key={p}
                className={`period-tab${period === p ? ' active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          {/* Refresh */}
          <button
            className="btn-icon"
            title="Refresh"
            onClick={() => loadDashboard(true)}
            style={{ marginLeft: '8px' }}
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI stat cards — clickable */}
      <div className="stats-grid">
        <StatCard
          label="Appointments"
          value={data.todaysAppointments}
          icon={<CalendarDays size={18} />}
          color="#2563EB"
          trend="Today"
          onClick={() => navigate('/appointments')}
        />
        <StatCard
          label="Revenue"
          value={formatMoney(data.todaysRevenue)}
          icon={<DollarSign size={18} />}
          color="#059669"
          trend="Today"
          onClick={() => navigate('/pos')}
        />
        <StatCard
          label="Pending Payments"
          value={formatMoney(data.pendingPayments)}
          icon={<Clock size={18} />}
          color="#D97706"
          trend={data.pendingPayments > 0 ? 'Needs attention' : 'All clear'}
          onClick={() => navigate('/pos')}
        />
        <StatCard
          label="Customers"
          value={data.activeCustomers}
          icon={<Users size={18} />}
          color="#7C3AED"
          trend="Active"
          onClick={() => navigate('/customers')}
        />
        <StatCard
          label="Staff on Duty"
          value={data.staffOnDuty}
          icon={<UserCheck size={18} />}
          color="#0D9488"
          trend="Active"
          onClick={() => navigate('/employees')}
        />
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <span className="quick-actions-label">Quick Actions</span>
        <button className="qa-btn" onClick={() => navigate('/appointments')}>
          <CalendarDays size={15} /> New Appointment
        </button>
        <button className="qa-btn" onClick={() => navigate('/customers')}>
          <UserPlus size={15} /> Add Customer
        </button>
        <button className="qa-btn" onClick={() => navigate('/pos')}>
          <PlusCircle size={15} /> New Invoice
        </button>
        <button className="qa-btn" onClick={() => navigate('/expenses')}>
          <TrendingDown size={15} /> Log Expense
        </button>
        <button className="qa-btn" onClick={() => navigate('/inventory')}>
          <Package size={15} /> Check Stock
        </button>
      </div>

      {/* Charts row */}
      <div className="split-grid" style={{ marginTop: '16px' }}>
        {/* Top Services Bar Chart */}
        <article className="panel">
          <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600 }}>Top Services by Revenue</h3>
          {topServicesForChart.length === 0
            ? <EmptyState title="No sales yet" description="Completed invoices will appear here." />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topServicesForChart} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: unknown) => formatMoney(Number(v))} cursor={{ fill: '#F8F9FB' }} />
                  <Bar dataKey="revenue" radius={[4,4,0,0]}>
                    {topServicesForChart.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
        </article>

        {/* Top Employees Commission */}
        <article className="panel">
          <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600 }}>Staff Commission (Month)</h3>
          {topEmployeesForChart.length === 0
            ? <EmptyState title="No commissions yet" description="Commission data will appear here." />
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topEmployeesForChart} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: unknown) => formatMoney(Number(v))} cursor={{ fill: '#F8F9FB' }} />
                  <Bar dataKey="commission" radius={[4,4,0,0]}>
                    {topEmployeesForChart.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
        </article>
      </div>

      {/* Revenue Trend */}
      {showRevenueChart && (
        <article className="panel" style={{ marginTop: '16px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600 }}>Revenue Trend — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueTrend} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C4622D" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#C4622D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: unknown) => formatMoney(Number(v))} />
              <Area type="monotone" dataKey="revenue" stroke="#C4622D" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </article>
      )}

      {/* Bottom row: Recent Appointments + Low Stock */}
      <div className="split-grid" style={{ marginTop: '16px' }}>
        <article className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Recent Appointments</h3>
            <button className="btn-ghost btn-sm" onClick={() => navigate('/appointments')}>View all →</button>
          </div>
          {recentAppointments.length === 0
            ? <EmptyState title="No appointments" description="Appointments will appear here." />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {recentAppointments.map(a => (
                  <div
                    key={a.id}
                    className="recent-appt-row"
                    onClick={() => navigate('/appointments')}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.customerName || 'Customer'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {a.employeeName} · {a.appointmentDate} {a.startTime?.slice(0,5)}
                      </div>
                    </div>
                    <StatusBadge status={a.status as any} />
                  </div>
                ))}
              </div>
            )}
        </article>

        <article className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
              <AlertTriangle size={14} style={{ display: 'inline', marginRight: '6px', color: 'var(--warning)' }} />
              Low Stock Alerts
            </h3>
            <button className="btn-ghost btn-sm" onClick={() => navigate('/inventory')}>View all →</button>
          </div>
          {(data.lowStock ?? []).length === 0
            ? <EmptyState title="Stock healthy" description="No low stock items detected." />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(data.lowStock ?? []).map(row => (
                  <div
                    key={row.name}
                    className="recent-appt-row"
                    onClick={() => navigate('/inventory')}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gray-800)' }}>{row.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {row.quantityOnHand} left · reorder at {row.reorderLevel}
                      </div>
                    </div>
                    <span className="status-badge badge-cancelled" style={{ fontSize: '11px' }}>Low</span>
                  </div>
                ))}
              </div>
            )}
        </article>
      </div>
    </section>
  )
}
