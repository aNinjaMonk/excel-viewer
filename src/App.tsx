import { useState } from 'react'
import { DataTable } from './components/DataTable'
import { FileDropzone } from './components/FileDropzone'
import { formatCell, readExcelFile, type ImportedWorkbook } from './utils/excelImport'
import { deleteRowsFromFile, type SourceFile } from './utils/excelWrite'
import './App.css'

function App() {
  const [source, setSource] = useState<SourceFile | null>(null)
  const [workbook, setWorkbook] = useState<ImportedWorkbook | null>(null)
  const [activeSheet, setActiveSheet] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const run = async (task: () => Promise<void>) => {
    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      await task()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleFile = (next: SourceFile) =>
    run(async () => {
      setWorkbook(await readExcelFile(next.file))
      setSource(next)
      setActiveSheet(0)
    })

  const handleDeleteRows = (rowNumbers: number[]) =>
    run(async () => {
      if (!source || !sheet) return
      const result = await deleteRowsFromFile(source, sheet.name, rowNumbers)
      setSource({ ...source, file: result.file })
      setWorkbook(await readExcelFile(result.file))
      const n = rowNumbers.length
      setNotice(
        result.mode === 'saved'
          ? `Deleted ${n} row${n === 1 ? '' : 's'} and saved ${result.file.name}.`
          : `Deleted ${n} row${n === 1 ? '' : 's'}. Your browser can't edit files in place, so the updated file was downloaded instead.`,
      )
    })

  const sheet = workbook?.sheets[activeSheet]

  return (
    <main className="app">
      <header>
        <h1>Excel Viewer</h1>
        <p className="muted">Import a spreadsheet to view, search and sort its data.</p>
      </header>

      <FileDropzone onFile={handleFile} disabled={loading} />
      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      {workbook && sheet && (
        <section className="workbook">
          <h2>{workbook.fileName}</h2>
          {!source?.handle && (
            <p className="muted small">
              Opened read-only: deleting rows will download an updated copy. Use Chrome or Edge and “Choose file” to
              edit the file in place.
            </p>
          )}

          {workbook.sheets.length > 1 && (
            <nav className="tabs" role="tablist">
              {workbook.sheets.map((s, i) => (
                <button
                  key={s.name}
                  role="tab"
                  aria-selected={i === activeSheet}
                  className={i === activeSheet ? 'active' : ''}
                  onClick={() => setActiveSheet(i)}
                >
                  {s.name}
                </button>
              ))}
            </nav>
          )}

          {sheet.preamble.length > 0 && (
            <dl className="preamble">
              {sheet.preamble.map((row, i) =>
                row.length === 1 && !formatCell(row[0]).trim().endsWith(':') ? (
                  <div key={i} className="preamble-title">{formatCell(row[0])}</div>
                ) : (
                  <div key={i}>
                    <dt>{formatCell(row[0]).replace(/:\s*$/, '')}</dt>
                    <dd>{row.slice(1).map(formatCell).join(' ')}</dd>
                  </div>
                ),
              )}
            </dl>
          )}

          <DataTable
            key={`${workbook.fileName}-${activeSheet}`}
            sheet={sheet}
            onDeleteRows={handleDeleteRows}
            busy={loading}
          />
        </section>
      )}
    </main>
  )
}

export default App
