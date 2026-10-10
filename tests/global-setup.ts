import ExcelJS from 'exceljs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default async function globalSetup() {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Sheet1')

  // Preamble rows (detected as metadata by the app since they have fewer cells than the header row)
  ws.addRow(['Bahi Khata - Account Statement'])
  ws.addRow(['Account Name', 'Test Account'])
  ws.addRow(['Balance as on Start', 0])
  ws.addRow(['Account Statement from Beginning'])
  // Header row (most filled cells — detected as the table header)
  ws.addRow(['Txn Date', 'Description', 'Amount Received', 'Amount Given', 'Balance'])
  // Data rows
  ws.addRow([new Date('2024-10-29'), 'Payment Received', 150000, null, 150000])
  ws.addRow([new Date('2024-11-06'), 'Payment Sent', null, 151500, -1500])

  await wb.xlsx.writeFile(path.join(__dirname, 'fixtures/preamble.xlsx'))
}
