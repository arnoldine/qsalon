import { useEffect, useRef, useState } from 'react'
import {
  Award, BarChart2, CalendarDays, ChevronDown,
  Download, FileText, Package, Printer,
  RefreshCw, TrendingDown, Users,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { SkeletonRow } from '../components/Skeleton'
import { ErrorState } from '../components/StateBlocks'
import { useToast } from '../context/ToastContext'
import { api, download } from '../lib/api'
import { formatMoney } from '../lib/money'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportType {
  id: string
  label: string
  description: string
  icon: React.ReactNode
}

interface PreviewResponse {
  rows: Record<string, unknown>[]
  generatedAt: string
  totalRows: number
}

type SortDir = 'asc' | 'desc' | null

// ─── Config ───────────────────────────────────────────────────────────────────

const REPORT_TYPES: ReportType[] = [
  { id: 'sales',        label: 'Sales & Invoices',  description: 'Revenue, payments, voids',     icon: <BarChart2 size={17} /> },
  { id: 'appointments', label: 'Appointments',       description: 'Bookings, no-shows, status',   icon: <CalendarDays size={17} /> },
  { id: 'customers',    label: 'Customers',          description: 'Client profiles, loyalty',     icon: <Users size={17} /> },
  { id: 'commissions',  label: 'Commissions',        description: 'Staff earnings by period',     icon: <Award size={17} /> },
  { id: 'inventory',    label: 'Inventory',          description: 'Stock levels, reorder alerts', icon: <Package size={17} /> },
  { id: 'expenses',     label: 'Expenses',           description: 'Operating costs by category',  icon: <TrendingDown size={17} /> },
]

const CURRENCY_KEYS = ['amount','revenue','total','paid','cost','price','commission',
  'serviceamount','commissionamount','totalamount','amountpaid','costprice','sellingprice']
const DATE_KEYS     = ['date','createdat','expensedate','appointmentdate']
const COUNT_KEYS    = ['quantity','quantityonhand','reorderlevel','loyaltypoints','count']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function headerLabel(key: string) {
  return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
    .replace(/\b\w/g, c => c.toUpperCase())
}
function isCurrency(key: string) { return CURRENCY_KEYS.some(k => key.toLowerCase().includes(k)) }
function isDate(key: string)     { return DATE_KEYS.some(k => key.toLowerCase() === k) }
function isCount(key: string)    { return COUNT_KEYS.some(k => key.toLowerCase() === k) }

function formatCell(key: string, val: unknown): string {
  if (val === null || val === undefined || val === '') return '—'
  if (isCurrency(key) && typeof val === 'number') return formatMoney(val)
  if (isDate(key)) {
    const d = new Date(String(val))
    return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString()
  }
  if (isCount(key) && typeof val === 'number') return val.toLocaleString()
  return String(val)
}

function isNumericCol(key: string, rows: Record<string, unknown>[]) {
  return isCurrency(key) || isCount(key) || rows.some(r => typeof r[key] === 'number')
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const { showToast } = useToast()

  const [activeType, setActiveType] = useState('')
  const [period, setPeriod]         = useState('monthly')
  const [fromDate, setFromDate]     = useState('')
  const [toDate, setToDate]         = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [preview, setPreview]       = useState<PreviewResponse | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [lastFormat, setLastFormat] = useState('csv')
  const [sortCol, setSortCol]       = useState<string | null>(null)
  const [sortDir, setSortDir]       = useState<SortDir>(null)

  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node))
        setExportOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeReport = REPORT_TYPES.find(r => r.id === activeType)

  async function loadPreview() {
    if (!activeType) return
    setLoading(true); setError(''); setPreview(null)
    setSortCol(null); setSortDir(null)
    try {
      const params = new URLSearchParams({ period })
      if (fromDate) params.set('from', fromDate)
      if (toDate)   params.set('to', toDate)
      const data = await api<PreviewResponse>(`/api/reports/${activeType}/preview?${params}`)
      setPreview(data)
      const count = (data.rows ?? []).length
      showToast(count === 0 ? 'No data for this period.' : `${count} rows loaded.`,
        count === 0 ? 'info' : 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load preview.'
      setError(msg); showToast(msg, 'error')
    } finally { setLoading(false) }
  }

  async function exportAs(format: string) {
    if (!activeType) return
    setLastFormat(format); setExportOpen(false)
    try {
      await download(`/api/reports/${activeType}?format=${format}`)
      showToast(`${activeReport?.label} exported as ${format.toUpperCase()}.`, 'success')
    } catch { showToast('Export failed.', 'error') }
  }

  function handleSort(col: string) {
    if (sortCol !== col) { setSortCol(col); setSortDir('asc'); return }
    if (sortDir === 'asc')  { setSortDir('desc'); return }
    setSortCol(null); setSortDir(null)
  }

  const columns   = preview?.rows?.[0] ? Object.keys(preview.rows[0]) : []
  const rows      = preview?.rows ?? []

  const sortedRows = sortCol && sortDir
    ? [...rows].sort((a, b) => {
        const av = a[sortCol] ?? ''; const bv = b[sortCol] ?? ''
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv : String(av).localeCompare(String(bv))
        return sortDir === 'asc' ? cmp : -cmp
      })
    : rows

  const commissionSummary = activeType === 'commissions' && rows.length > 0
    ? {
        serviceTotal:    rows.reduce((s, r) => s + Number(r['serviceAmount'] ?? r['ServiceAmount'] ?? 0), 0),
        commissionTotal: rows.reduce((s, r) => s + Number(r['commissionAmount'] ?? r['CommissionAmount'] ?? 0), 0),
        staffCount:      new Set(rows.map(r => r['employee'] ?? r['Employee'])).size,
      }
    : null

  return (
    <section>
      <PageHeader title="Reports" subtitle="Preview, filter and export business reports" />

      <div className="reports-layout">

        {/* ── Left: report type selector ── */}
        <aside className="report-selector report-print-hide">
          <div className="report-selector-title">Report Type</div>
          {REPORT_TYPES.map(rt => (
            <button
              key={rt.id}
              className={`report-type-item${activeType === rt.id ? ' active' : ''}`}
              onClick={() => { setActiveType(rt.id); setPreview(null); setError('') }}
            >
              <span className="report-type-icon">{rt.icon}</span>
              <span>
                <div className="report-type-name">{rt.label}</div>
                <div className="report-type-desc">{rt.description}</div>
              </span>
            </button>
          ))}
        </aside>

        {/* ── Right: toolbar + preview ── */}
        <div className="report-main">

          {/* Toolbar */}
          <div className="report-toolbar report-print-hide">
            <div className="report-toolbar-title">
              <h3>{activeReport?.label ?? 'Select a report'}</h3>
              <p>{activeReport?.description ?? 'Choose a report type from the left panel'}</p>
            </div>

            <div className="report-toolbar-actions">
              <select value={period} onChange={e => setPeriod(e.target.value)}
                style={{ minHeight: '40px', fontSize: '13px' }}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom Range</option>
              </select>

              {period === 'custom' && (
                <>
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                    style={{ minHeight: '40px', fontSize: '13px', width: 'auto' }} />
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                    style={{ minHeight: '40px', fontSize: '13px', width: 'auto' }} />
                </>
              )}

              <button onClick={loadPreview} disabled={!activeType || loading}
                style={{ minHeight: '40px', fontSize: '13px' }}>
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
                {loading ? 'Loading…' : 'Load Preview'}
              </button>

              {/* Split export button */}
              <div className="split-btn" ref={exportRef}>
                <button className="split-btn-main" disabled={!preview || loading}
                  onClick={() => exportAs(lastFormat)}
                  title={`Export as ${lastFormat.toUpperCase()}`}>
                  <Download size={14} /> Export {lastFormat.toUpperCase()}
                </button>
                <button className="split-btn-chevron" disabled={!preview || loading}
                  onClick={() => setExportOpen(o => !o)} title="More export formats">
                  <ChevronDown size={13} />
                </button>
                {exportOpen && (
                  <div className="export-dropdown">
                    {[['csv','📄','CSV'],['xlsx','📊','Excel'],['pdf','📑','PDF']].map(([fmt, icon, label]) => (
                      <button key={fmt} className="export-dropdown-item" onClick={() => exportAs(fmt)}>
                        <span>{icon}</span> {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button className="btn-print" disabled={!preview} onClick={() => window.print()}>
                <Printer size={14} /> Print
              </button>
            </div>
          </div>

          {/* Preview card */}
          <div className="report-preview">

            {commissionSummary && (
              <div className="commission-summary">
                <div className="commission-chip">
                  💰 Total Service Revenue <strong>{formatMoney(commissionSummary.serviceTotal)}</strong>
                </div>
                <div className="commission-chip">
                  🏆 Total Commission Paid <strong>{formatMoney(commissionSummary.commissionTotal)}</strong>
                </div>
                <div className="commission-chip">
                  👥 Staff Members <strong>{commissionSummary.staffCount}</strong>
                </div>
              </div>
            )}

            {preview && (
              <div className="report-preview-header">
                <div className="report-preview-meta">
                  <strong>{activeReport?.label}</strong>
                  {' · '}
                  {period === 'custom' && fromDate && toDate
                    ? `${fromDate} → ${toDate}`
                    : period.charAt(0).toUpperCase() + period.slice(1)}
                  {' · '}
                  <strong>{rows.length}</strong> rows
                  {preview.totalRows > rows.length && (
                    <span style={{ color:'var(--warning)', marginLeft:'6px' }}>
                      (first 500 of {preview.totalRows})
                    </span>
                  )}
                </div>
                <div className="report-preview-meta">
                  Generated {new Date(preview.generatedAt).toLocaleString()}
                </div>
              </div>
            )}

            <div className="report-preview-body">
              {!activeType && !loading && !error && (
                <div className="report-empty-state">
                  <FileText size={56} strokeWidth={1} />
                  <p>Select a report type from the left panel</p>
                  <span>Then click Load Preview to see your data</span>
                </div>
              )}

              {activeType && !loading && !error && !preview && (
                <div className="report-empty-state">
                  <FileText size={56} strokeWidth={1} />
                  <p>Click <strong>Load Preview</strong> to fetch data</p>
                  <span>Filter by period before exporting</span>
                </div>
              )}

              {loading && (
                <div style={{ padding:'16px', display:'flex', flexDirection:'column', gap:'8px' }}>
                  {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
                </div>
              )}

              {error && !loading && <ErrorState message={error} />}

              {preview && !loading && !error && (
                <>
                  {sortedRows.length === 0 ? (
                    <div className="report-empty-state">
                      <FileText size={48} strokeWidth={1} />
                      <p>No data found for this period</p>
                      <span>Try a different period or date range</span>
                    </div>
                  ) : (
                    <table className="report-table">
                      <thead>
                        <tr>
                          {columns.map(col => (
                            <th key={col}
                              className={[
                                isNumericCol(col, rows) ? 'num' : '',
                                sortCol === col ? (sortDir === 'asc' ? 'sort-asc' : 'sort-desc') : '',
                              ].join(' ').trim()}
                              onClick={() => handleSort(col)} title="Click to sort">
                              {headerLabel(col)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRows.map((row, i) => (
                          <tr key={i}>
                            {columns.map(col => (
                              <td key={col} className={isNumericCol(col, rows) ? 'num' : ''}>
                                {formatCell(col, row[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="report-table-footer">
                    Showing {sortedRows.length} row{sortedRows.length !== 1 ? 's' : ''}
                    {sortCol && ` · Sorted by ${headerLabel(sortCol)} (${sortDir ?? ''})`}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
