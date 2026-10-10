import { test, expect } from '@playwright/test'
import { FIXTURES, loadFile, loadCsv } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

// TC-01
test('initial state shows dropzone and no data', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Excel Viewer' })).toBeVisible()
  await expect(page.getByText('Import a spreadsheet to view, search and sort its data.')).toBeVisible()
  await expect(page.getByText('Drag & drop an Excel file here, or')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Choose file' })).toBeVisible()
  await expect(page.getByText('Supports .xlsx, .xls, .xlsm, .xlsb, .ods, .csv')).toBeVisible()
  await expect(page.locator('.workbook')).not.toBeVisible()
  await expect(page.locator('.error')).not.toBeVisible()
})

// TC-02
test('invalid file type shows error and no table', async ({ page }) => {
  await loadFile(page, FIXTURES.invalid)
  await expect(page.locator('.error')).toContainText('Unsupported file type ".txt"')
  await expect(page.locator('.error')).toContainText('Use one of: .xlsx, .xls, .xlsm, .xlsb, .ods, .csv')
  await expect(page.locator('table')).not.toBeVisible()
})

// TC-03
test('load CSV shows rows, columns and read-only notice', async ({ page }) => {
  await loadCsv(page)
  await expect(page.getByRole('heading', { name: 'basic.csv' })).toBeVisible()
  await expect(page.getByText('Opened read-only')).toBeVisible()
  await expect(page.getByText('4 of 4 rows')).toBeVisible()

  // Column headers
  const headers = page.locator('thead th button')
  await expect(headers.nth(0)).toContainText('Name')
  await expect(headers.nth(1)).toContainText('Age')
  await expect(headers.nth(2)).toContainText('City')
  await expect(headers.nth(3)).toContainText('Score')

  // Numeric cells right-aligned
  const ageCells = page.locator('tbody tr td.num').first()
  await expect(ageCells).toBeVisible()

  // No preamble
  await expect(page.locator('.preamble')).not.toBeVisible()
})

// TC-21
test('load XLSX shows preamble metadata and data rows', async ({ page }) => {
  await loadFile(page, FIXTURES.preamble)
  await page.getByText('2 of 2 rows').waitFor()

  // Preamble
  await expect(page.locator('.preamble')).toBeVisible()
  await expect(page.getByText('Bahi Khata - Account Statement')).toBeVisible()
  await expect(page.getByText('Test Account')).toBeVisible()

  // Columns
  const headers = page.locator('thead th button')
  await expect(headers.nth(0)).toContainText('Txn Date')
  await expect(headers.nth(1)).toContainText('Description')

  // Data rows
  const rows = page.locator('tbody tr')
  await expect(rows).toHaveCount(2)
  await expect(rows.nth(0)).toContainText('Payment Received')
  await expect(rows.nth(1)).toContainText('Payment Sent')
})

// TC-23
test('loading a new file replaces previous data and resets state', async ({ page }) => {
  // Load XLSX first
  await loadFile(page, FIXTURES.preamble)
  await page.getByText('2 of 2 rows').waitFor()

  // Sort by Txn Date to add state
  await page.locator('thead th button').first().click()

  // Load CSV — should replace everything
  await loadCsv(page)

  await expect(page.getByRole('heading', { name: 'basic.csv' })).toBeVisible()
  await expect(page.getByText('4 of 4 rows')).toBeVisible()
  await expect(page.locator('.preamble')).not.toBeVisible()

  // Sort indicator cleared
  await expect(page.locator('thead th button').nth(0)).not.toContainText('▲')
  await expect(page.locator('thead th button').nth(0)).not.toContainText('▼')
})
