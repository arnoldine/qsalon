import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  color?: string   // CSS color for icon bg
  trend?: string   // e.g. "+12% vs yesterday"
}

export function StatCard({ label, value, icon, color, trend }: StatCardProps) {
  return (
    <article className="stat-card">
      <div className="stat-card-head">
        <h3>{label}</h3>
        {icon ? (
          <span
            className="stat-card-icon"
            style={{ background: color ? `${color}1A` : 'var(--brand-50)', color: color ?? 'var(--brand-500)' }}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p>{value}</p>
      {trend ? <p className="stat-card-trend">{trend}</p> : null}
    </article>
  )
}
