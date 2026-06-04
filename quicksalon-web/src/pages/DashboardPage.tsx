import { useEffect, useState } from 'react'
import { CalendarDays, Clock, DollarSign, UserCheck, Users } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '../components/PageHeader'
import { SkeletonCard } from '../components/Skeleton'
import { EmptyState, ErrorState } from '../components/StateBlocks'
import { useToast } from '../context/ToastContext'
import { StatCard } from '../components/StatCard'
import { api } from '../lib/api'
import { formatMoney } from '../lib/money'
import type { DashboardKpis } from '../types'

interface RevenueTrendPoint {
  date: string
  revenue: number
}

export function DashboardPage() {
  const { showToast } = useToast()
  const [data, setData] = useState<DashboardKpis | null>(null)
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>([])
  const [showRevenueChart, setShowRevenueChart] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const kpis = await api<DashboardKpis>('/api/dashboard/kpis')
        setData(kpis)
      } catch {
        setError('Unable to load dashboard right now.')
        showToast('Unable to load dashboard right now.', 'error')
      } finally {
        setLoading(false)
      }

      try {
        const trend = await api<{ data: RevenueTrendPoint[] }>('/api/dashboard/revenue-trend')
        setRevenueTrend(trend.data)
        setShowRevenueChart(trend.data.length > 0)
      } catch {
        setShowRevenueChart(false)
      }
    }

    loadDashboard()
  }, [])

  if (loading) {
    return (
      <section>
        <PageHeader title="Salon Dashboard" subtitle="Track daily operations, payments, staff activity, and low-stock alerts" />
        <div className="stats-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    )
  }

  if (error) return <ErrorState message={error} />
  if (!data) return <EmptyState title="No dashboard data" description="Create appointments and invoices to populate KPIs." />

  return (
    <section>
      <PageHeader title="Salon Dashboard" subtitle="Track daily operations, payments, staff activity, and low-stock alerts" />
      <div className="stats-grid">
        <StatCard label="Today's Appointments" value={data.todaysAppointments} icon={<CalendarDays size={18} />} color="#2563EB" />
        <StatCard label="Today's Revenue" value={formatMoney(data.todaysRevenue)} icon={<DollarSign size={18} />} color="#059669" />
        <StatCard label="Pending Payments" value={formatMoney(data.pendingPayments)} icon={<Clock size={18} />} color="#D97706" />
        <StatCard label="Active Customers" value={data.activeCustomers} icon={<Users size={18} />} color="#7C3AED" />
        <StatCard label="Staff On Duty" value={data.staffOnDuty} icon={<UserCheck size={18} />} color="#0D9488" />
      </div>

      <div className="split-grid">
        <article className="panel">
          <h3>Top Services</h3>
          {data.topServices.length === 0 ? <EmptyState title="No service sales yet" description="Completed invoices will appear here." /> : (
            <ul>
              {data.topServices.map((row) => (
                <li key={row.service}>{row.service} - {formatMoney(row.revenue)} ({row.count}x)</li>
              ))}
            </ul>
          )}
        </article>
        <article className="panel">
          <h3>Low Stock</h3>
          {data.lowStock.length === 0 ? <EmptyState title="Stock healthy" description="No low stock items detected." /> : (
            <ul>
              {data.lowStock.map((row) => (
                <li key={row.name}>{row.name} ({row.quantityOnHand}/{row.reorderLevel})</li>
              ))}
            </ul>
          )}
        </article>
      </div>

      {showRevenueChart ? (
        <article className="panel dashboard-chart">
          <h3>Revenue Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E5EA" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#C4622D" fill="#C4622D" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </article>
      ) : null}
    </section>
  )
}
