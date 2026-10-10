import { type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const FIXTURES = {
  csv: path.join(__dirname, 'fixtures/basic.csv'),
  invalid: path.join(__dirname, 'fixtures/invalid.txt'),
  preamble: path.join(__dirname, 'fixtures/preamble.xlsx'),
}

export async function loadFile(page: Page, filePath: string) {
  await page.locator('input[type="file"]').setInputFiles(filePath)
}

export async function loadCsv(page: Page) {
  await loadFile(page, FIXTURES.csv)
  await page.getByText('4 of 4 rows').waitFor()
}
