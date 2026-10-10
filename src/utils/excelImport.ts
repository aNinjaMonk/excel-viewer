import * as XLSX from 'xlsx'

export type CellValue = string | number | boolean | Date | null

export interface ImportedRow {
  /** 1-based row number in the worksheet, as shown in Excel */
  rowNumber: number
  cells: Record<string, CellValue>
}

export interface ImportedSheet {
  name: string
  /** Rows above the detected header (titles, "Key: value" metadata, etc.) */
  preamble: CellValue[][]
  headers: string[]
  rows: ImportedRow[]
}

export interface ImportedWorkbook {
  fileName: string
  sheets: ImportedSheet[]
}

export interface ImportOptions {
  /**
   * Zero-based row index of the header. When omitted the header is detected
   * as the first row with the most filled cells, which handles report-style
   * sheets that have a title block above the table.
   */
  headerRow?: number
  /** Rows below the header with fewer filled cells than this are dropped (footers, notes). */
  minFilledCells?: number
}

export const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.xlsm', '.xlsb', '.ods', '.csv']
export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(',')

const isFilled = (v: CellValue) => v !== null && v !== ''

const countFilled = (row: CellValue[]) => row.filter(isFilled).length

function detectHeaderRow(matrix: CellValue[][]): number {
  const max = Math.max(0, ...matrix.map(countFilled))
  return Math.max(0, matrix.findIndex((row) => countFilled(row) === max))
}

/** Ensures every header is non-empty and unique so it can be used as an object key. */
function normalizeHeaders(raw: CellValue[]): string[] {
  const seen = new Map<string, number>()
  return raw.map((cell, i) => {
    const base = isFilled(cell) ? String(cell).trim() : `Column ${i + 1}`
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    return n === 0 ? base : `${base} (${n + 1})`
  })
}

export function parseSheet(
  name: string,
  ws: XLSX.WorkSheet,
  { headerRow, minFilledCells = 2 }: ImportOptions = {},
): ImportedSheet {
  const matrix = XLSX.utils.sheet_to_json<CellValue[]>(ws, {
    header: 1,
    defval: null,
    blankrows: true,
    raw: true,
  })

  if (matrix.length === 0) return { name, preamble: [], headers: [], rows: [] }

  // sheet_to_json starts at the first row of the sheet's used range, not necessarily row 1
  const firstRow = XLSX.utils.decode_range(ws['!ref'] ?? 'A1').s.r + 1
  const h = headerRow ?? detectHeaderRow(matrix)
  const headers = normalizeHeaders(matrix[h])
  const threshold = Math.min(minFilledCells, headers.length)

  const rows = matrix
    .map((row, i) => ({ row, rowNumber: firstRow + i }))
    .slice(h + 1)
    .filter(({ row }) => countFilled(row) >= threshold)
    .map(({ row, rowNumber }) => ({
      rowNumber,
      cells: Object.fromEntries(
        headers.map((key, i) => [key, row[i] === '' ? null : (row[i] ?? null)]),
      ),
    }))

  const preamble = matrix
    .slice(0, h)
    .map((row) => row.filter(isFilled))
    .filter((row) => row.length > 0)

  return { name, preamble, headers, rows }
}

export function parseWorkbook(
  data: ArrayBuffer,
  fileName = 'workbook',
  options?: ImportOptions,
): ImportedWorkbook {
  const wb = XLSX.read(data, { type: 'array', cellDates: true })
  return {
    fileName,
    sheets: wb.SheetNames.map((name) => parseSheet(name, wb.Sheets[name], options)),
  }
}

export const fileExtension = (name: string) => name.slice(name.lastIndexOf('.')).toLowerCase()

export async function readExcelFile(file: File, options?: ImportOptions): Promise<ImportedWorkbook> {
  const ext = fileExtension(file.name)
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported file type "${ext}". Use one of: ${ACCEPTED_EXTENSIONS.join(', ')}`)
  }
  return parseWorkbook(await file.arrayBuffer(), file.name, options)
}

/** Formats a cell for display. */
export function formatCell(v: CellValue): string {
  if (v === null) return ''
  if (v instanceof Date) return v.toLocaleDateString()
  if (typeof v === 'number') return v.toLocaleString()
  return String(v)
}

/**
 * Comparable value for sorting. Understands numbers stored as text with
 * currency symbols / thousands separators (e.g. "₹1,50,000.00") and date strings.
 */
export function sortKey(v: CellValue): number | string {
  if (v === null) return ''
  if (v instanceof Date) return v.getTime()
  if (typeof v === 'number') return v
  if (typeof v === 'boolean') return v ? 1 : 0
  const s = v.trim()
  const numeric = s.replace(/[^\d.-]/g, '')
  if (/\d/.test(s) && /^-?\d*\.?\d+$/.test(numeric) && !/[a-z]/i.test(s)) return Number(numeric)
  const date = Date.parse(s)
  if (!Number.isNaN(date) && /\d/.test(s)) return date
  return s.toLowerCase()
}
