import { useEffect, useState } from 'react'
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
        <StatCard label="Today's Appointments" value={data.todaysAppointments} />
        <StatCard label="Today's Revenue" value={formatMoney(data.todaysRevenue)} />
        <StatCard label="Pending Payments" value={formatMoney(data.pendingPayments)} />
        <StatCard label="Active Customers" value={data.activeCustomers} />
        <StatCard label="Staff On Duty" value={data.staffOnDuty} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#ead8c5" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="#b2592f" fill="#b2592f" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </article>
      ) : null}
    </section>
  )
}
