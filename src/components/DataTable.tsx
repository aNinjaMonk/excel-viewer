import { useEffect, useMemo, useRef, useState } from 'react'
import { formatCell, sortKey, type ImportedSheet } from '../utils/excelImport'
import { ConfirmDialog } from './ConfirmDialog'

type SortState = { column: string; dir: 'asc' | 'desc' } | null

interface DataTableProps {
  sheet: ImportedSheet
  /** Called with the worksheet row numbers to delete. Selection is cleared once it resolves. */
  onDeleteRows: (rowNumbers: number[]) => Promise<void>
  busy?: boolean
}

export function DataTable({ sheet, onDeleteRows, busy }: DataTableProps) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const selectAllRef = useRef<HTMLInputElement>(null)

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = q
      ? sheet.rows.filter((row) =>
          sheet.headers.some((h) => formatCell(row.cells[h]).toLowerCase().includes(q)),
        )
      : sheet.rows

    if (sort) {
      const factor = sort.dir === 'asc' ? 1 : -1
      rows = [...rows].sort((a, b) => {
        const ka = sortKey(a.cells[sort.column])
        const kb = sortKey(b.cells[sort.column])
        if (ka === kb) return 0
        if (typeof ka !== typeof kb) return (typeof ka === 'number' ? -1 : 1) * factor
        return (ka < kb ? -1 : 1) * factor
      })
    }
    return rows
  }, [sheet, query, sort])

  // Row numbers shift after a delete, so any old selection is meaningless
  const [prevSheet, setPrevSheet] = useState(sheet)
  if (sheet !== prevSheet) {
    setPrevSheet(sheet)
    setSelected(new Set())
    setConfirmOpen(false)
  }

  const visibleSelected = visibleRows.filter((r) => selected.has(r.rowNumber)).length
  const allVisibleSelected = visibleRows.length > 0 && visibleSelected === visibleRows.length

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = visibleSelected > 0 && !allVisibleSelected
    }
  }, [visibleSelected, allVisibleSelected])

  const toggleRow = (rowNumber: number) =>
    setSelected((s) => {
      const next = new Set(s)
      if (!next.delete(rowNumber)) next.add(rowNumber)
      return next
    })

  const toggleAllVisible = () =>
    setSelected((s) => {
      const next = new Set(s)
      for (const r of visibleRows) {
        if (allVisibleSelected) next.delete(r.rowNumber)
        else next.add(r.rowNumber)
      }
      return next
    })

  const toggleSort = (column: string) =>
    setSort((s) =>
      s?.column !== column ? { column, dir: 'asc' } : s.dir === 'asc' ? { column, dir: 'desc' } : null,
    )

  const deleteSelected = async () => {
    await onDeleteRows([...selected])
    setConfirmOpen(false)
  }

  const plural = selected.size === 1 ? '' : 's'
  const previewRows = sheet.rows.filter((r) => selected.has(r.rowNumber))
  const previewColumns = sheet.headers.slice(0, 3)

  if (sheet.headers.length === 0) return <p className="muted">This sheet is empty.</p>

  return (
    <div className="table-section">
      <div className="table-toolbar">
        <input
          type="search"
          placeholder="Search rows…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="muted">
          {visibleRows.length} of {sheet.rows.length} rows
        </span>
        {selected.size > 0 && (
          <div className="selection-actions">
            <span>{selected.size} selected</span>
            <button type="button" disabled={busy} onClick={() => setSelected(new Set())}>
              Clear
            </button>
            <button type="button" className="danger" disabled={busy} onClick={() => setConfirmOpen(true)}>
              Delete {selected.size} row{plural}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete ${selected.size} row${plural}?`}
        confirmLabel={`Delete ${selected.size} row${plural}`}
        busyLabel="Deleting…"
        busy={busy}
        onConfirm={deleteSelected}
        onCancel={() => setConfirmOpen(false)}
      >
        <div className="confirm-preview">
          <table>
            <thead>
              <tr>
                {previewColumns.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row) => (
                <tr key={row.rowNumber}>
                  {previewColumns.map((h) => (
                    <td key={h}>{formatCell(row.cells[h])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ConfirmDialog>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="select-col">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  aria-label="Select all visible rows"
                  checked={allVisibleSelected}
                  disabled={visibleRows.length === 0}
                  onChange={toggleAllVisible}
                />
              </th>
              {sheet.headers.map((h) => (
                <th key={h} aria-sort={sort?.column === h ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => toggleSort(h)}>
                    {h}
                    <span className="sort-indicator">
                      {sort?.column === h ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const isSelected = selected.has(row.rowNumber)
              return (
                <tr key={row.rowNumber} className={isSelected ? 'selected' : undefined}>
                  <td className="select-col">
                    <input
                      type="checkbox"
                      aria-label={`Select row ${row.rowNumber}`}
                      checked={isSelected}
                      onChange={() => toggleRow(row.rowNumber)}
                    />
                  </td>
                  {sheet.headers.map((h) => (
                    <td key={h} className={typeof sortKey(row.cells[h]) === 'number' ? 'num' : undefined}>
                      {formatCell(row.cells[h])}
                    </td>
                  ))}
                </tr>
              )
            })}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={sheet.headers.length + 1} className="muted center">
                  No matching rows
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
