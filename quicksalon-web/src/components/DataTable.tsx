import { useMemo, useState } from 'react'

interface DataTableProps {
  headers: string[]
  rows: Array<Array<string | number | null | undefined>>
  onRowClick?: (rowIndex: number, row: Array<string | number | null | undefined>) => void
  totalCount?: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
}

type SortDirection = 'asc' | 'desc' | 'none'

export function DataTable({ headers, rows, onRowClick, totalCount, page = 1, pageSize, onPageChange }: DataTableProps) {
  const [sortColumn, setSortColumn] = useState<number | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('none')

  const sortedRows = useMemo(() => {
    if (sortColumn === null || sortDirection === 'none') {
      return rows
    }

    const copy = [...rows]
    copy.sort((a, b) => {
      const left = a[sortColumn]
      const right = b[sortColumn]

      if (left == null && right == null) return 0
      if (left == null) return 1
      if (right == null) return -1

      if (typeof left === 'number' && typeof right === 'number') {
        return sortDirection === 'asc' ? left - right : right - left
      }

      const leftStr = String(left).toLowerCase()
      const rightStr = String(right).toLowerCase()
      if (leftStr === rightStr) return 0
      if (sortDirection === 'asc') {
        return leftStr > rightStr ? 1 : -1
      }

      return leftStr < rightStr ? 1 : -1
    })

    return copy
  }, [rows, sortColumn, sortDirection])

  function toggleSort(columnIndex: number) {
    if (sortColumn !== columnIndex) {
      setSortColumn(columnIndex)
      setSortDirection('asc')
      return
    }

    if (sortDirection === 'asc') {
      setSortDirection('desc')
      return
    }

    if (sortDirection === 'desc') {
      setSortDirection('none')
      setSortColumn(null)
      return
    }

    setSortDirection('asc')
  }

  const totalPages = totalCount && pageSize ? Math.max(Math.ceil(totalCount / pageSize), 1) : 1

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((h, idx) => (
              <th key={h} onClick={() => toggleSort(idx)}>
                {h}
                {sortColumn === idx && sortDirection === 'asc' ? ' ▲' : null}
                {sortColumn === idx && sortDirection === 'desc' ? ' ▼' : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, idx) => (
            <tr key={idx} onClick={onRowClick ? () => onRowClick(idx, row) : undefined} className={onRowClick ? 'table-row-clickable' : ''}>
              {row.map((cell, cidx) => (
                <td key={`${idx}-${cidx}`}>{cell ?? ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {typeof totalCount === 'number' && pageSize && onPageChange ? (
        <div className="table-pagination">
          <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}>
            ← Prev
          </button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
            Next →
          </button>
        </div>
      ) : null}
    </div>
  )
}
