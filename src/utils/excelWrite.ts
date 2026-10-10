import * as XLSX from 'xlsx'
import { fileExtension } from './excelImport'

/** A file the user opened. `handle` is present when the browser can write back to it in place. */
export interface SourceFile {
  file: File
  handle?: FileSystemFileHandle
}

export type SaveResult = { mode: 'saved' | 'downloaded'; file: File }

const SHEETJS_BOOK_TYPES: Record<string, XLSX.BookType> = {
  '.xlsm': 'xlsm',
  '.xlsb': 'xlsb',
  '.xls': 'xls',
  '.ods': 'ods',
  '.csv': 'csv',
}

/**
 * Removes whole rows from one worksheet, shifting the rows below up.
 * Cells, merges and row heights below each deleted row move with it.
 * Formulas that reference shifted cells are not rewritten.
 */
export function deleteSheetRows(ws: XLSX.WorkSheet, rowNumbers: number[]) {
  const deleted = [...new Set(rowNumbers.map((n) => n - 1))].sort((a, b) => a - b)
  const isDeleted = new Set(deleted)
  const shiftFor = (r: number) => deleted.filter((d) => d < r).length

  const cells: [string, XLSX.CellObject][] = []
  for (const key of Object.keys(ws)) {
    if (key.startsWith('!')) continue
    cells.push([key, ws[key]])
    delete ws[key]
  }
  for (const [key, cell] of cells) {
    const { r, c } = XLSX.utils.decode_cell(key)
    if (!isDeleted.has(r)) ws[XLSX.utils.encode_cell({ r: r - shiftFor(r), c })] = cell
  }

  if (ws['!merges']) {
    ws['!merges'] = ws['!merges']
      .filter((m) => !deleted.some((d) => d >= m.s.r && d <= m.e.r))
      .map((m) => ({
        s: { r: m.s.r - shiftFor(m.s.r), c: m.s.c },
        e: { r: m.e.r - shiftFor(m.e.r), c: m.e.c },
      }))
  }

  if (ws['!rows']) ws['!rows'] = ws['!rows'].filter((_, r) => !isDeleted.has(r))

  if (ws['!ref']) {
    const range = XLSX.utils.decode_range(ws['!ref'])
    range.e.r = Math.max(range.s.r, range.e.r - deleted.filter((d) => d <= range.e.r).length)
    ws['!ref'] = XLSX.utils.encode_range(range)
  }
}

/** .xlsx goes through ExcelJS so cell styles (fonts, fills, borders, number formats) survive. */
async function deleteRowsXlsx(data: ArrayBuffer, sheetName: string, rowNumbers: number[]) {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(data)
  const ws = wb.getWorksheet(sheetName)
  if (!ws) throw new Error(`Sheet "${sheetName}" not found`)
  const deleted = [...new Set(rowNumbers)].sort((a, b) => b - a)

  // spliceRows doesn't move merged ranges, so unmerge first and re-merge at shifted positions
  const merges = (ws.model.merges ?? []).map((ref) => XLSX.utils.decode_range(ref))
  for (const m of merges) ws.unMergeCells(XLSX.utils.encode_range(m))

  // Bottom-up so earlier deletions don't shift the rows still to be deleted
  for (const n of deleted) ws.spliceRows(n, 1)

  const shiftFor = (r: number) => deleted.filter((d) => d - 1 < r).length
  for (const { s, e } of merges) {
    if (deleted.some((d) => d - 1 >= s.r && d - 1 <= e.r)) continue
    ws.mergeCells(
      XLSX.utils.encode_range({ s: { r: s.r - shiftFor(s.r), c: s.c }, e: { r: e.r - shiftFor(e.r), c: e.c } }),
    )
  }
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}

function deleteRowsSheetJS(data: ArrayBuffer, ext: string, sheetName: string, rowNumbers: number[]) {
  const bookType = SHEETJS_BOOK_TYPES[ext]
  if (!bookType) throw new Error(`Saving ${ext} files is not supported`)
  const wb = XLSX.read(data, { type: 'array', cellStyles: true, cellNF: true, bookVBA: true })
  const ws = wb.Sheets[sheetName]
  if (!ws) throw new Error(`Sheet "${sheetName}" not found`)
  deleteSheetRows(ws, rowNumbers)
  return XLSX.write(wb, { type: 'array', bookType, sheet: sheetName }) as ArrayBuffer
}

async function ensureWritePermission(handle: FileSystemFileHandle) {
  const opts = { mode: 'readwrite' } as const
  if ((await handle.queryPermission?.(opts)) === 'granted') return
  if ((await handle.requestPermission?.(opts)) !== 'granted') {
    throw new Error('Permission to modify the file was denied')
  }
}

function download(bytes: ArrayBuffer, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Deletes rows from a sheet and persists the change: written back to the original file
 * when the browser granted a file handle, otherwise downloaded as a modified copy.
 */
export async function deleteRowsFromFile(
  source: SourceFile,
  sheetName: string,
  rowNumbers: number[],
): Promise<SaveResult> {
  if (rowNumbers.length === 0) return { mode: 'saved', file: source.file }

  const ext = fileExtension(source.file.name)
  // Re-read so we never overwrite edits made to the file after it was opened
  const current = source.handle ? await source.handle.getFile() : source.file
  const data = await current.arrayBuffer()

  const bytes =
    ext === '.xlsx'
      ? await deleteRowsXlsx(data, sheetName, rowNumbers)
      : deleteRowsSheetJS(data, ext, sheetName, rowNumbers)

  if (source.handle) {
    await ensureWritePermission(source.handle)
    const writable = await source.handle.createWritable()
    await writable.write(bytes)
    await writable.close()
    return { mode: 'saved', file: await source.handle.getFile() }
  }

  download(bytes, current.name, current.type)
  return { mode: 'downloaded', file: new File([bytes], current.name, { type: current.type }) }
}
