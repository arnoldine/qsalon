import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { SkeletonRow } from '../components/Skeleton'
import { useToast } from '../context/ToastContext'
import { api, download } from '../lib/api'
import { formatMoney } from '../lib/money'

interface CommissionRow {
  employee: string
  serviceAmount: number
  commissionAmount: number
}

const reportTypes = ['sales', 'appointments', 'customers', 'commissions', 'inventory']
const formats = ['csv', 'xlsx', 'pdf']

export function ReportsPage() {
  const { showToast } = useToast()
  const [period, setPeriod] = useState('daily')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rows, setRows] = useState<CommissionRow[]>([])
  const [loading, setLoading] = useState(false)

  async function loadCommissions() {
    setLoading(true)
    try {
      const result = await api<CommissionRow[]>(`/api/commissions?period=${period}`)
      setRows(result)
      showToast('Commissions loaded.', 'success')
    } catch {
      showToast('Failed to load commissions.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function exportReport(type: string, format: string) {
    try {
      await download(`/api/reports/${type}?format=${format}`)
      showToast(`${type} report exported as ${format.toUpperCase()}.`, 'success')
    } catch {
      showToast(`Failed to export ${type} report (${format.toUpperCase()}).`, 'error')
    }
  }

  return (
    <section>
      <PageHeader title="Reports" subtitle="Summary cards, filters, and export options" />
      <div className="panel toolbar">
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button onClick={loadCommissions}>Load Commissions</button>
      </div>
      <div className="panel">
        <h3>Exports</h3>
        {reportTypes.map((type) => (
          <div key={type} className="toolbar">
            <strong>{type}</strong>
            {formats.map((format) => (
              <button key={format} onClick={() => exportReport(type, format)}>{format.toUpperCase()}</button>
            ))}
          </div>
        ))}
      </div>
      <div className="panel">
        <h3>Commission Summary</h3>
        {loading ? (
          <div className="skeleton-row-grid">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        ) : (
          <ul>
            {rows.map((r) => (
              <li key={r.employee}>{r.employee}: {formatMoney(r.commissionAmount)} from {formatMoney(r.serviceAmount)}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
