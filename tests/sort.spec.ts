import { test, expect } from '@playwright/test'
import { FIXTURES, loadFile, loadCsv } from './helpers.js'

test.describe('sort — CSV', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await loadCsv(page)
  })

  // TC-07
  test('numeric column sorts ascending on first click', async ({ page }) => {
    const scoreHeader = page.locator('thead th button', { hasText: 'Score' })
    await scoreHeader.click()

    await expect(scoreHeader).toContainText('▲')

    const names = page.locator('tbody tr td:first-child')
    await expect(names.nth(0)).toHaveText('Charlie') // 78.3
    await expect(names.nth(1)).toHaveText('Bob')     // 82
    await expect(names.nth(2)).toHaveText('Diana')   // 91.2
    await expect(names.nth(3)).toHaveText('Alice')   // 95.5
  })

  // TC-08
  test('numeric column sorts descending on second click', async ({ page }) => {
    const scoreHeader = page.locator('thead th button', { hasText: 'Score' })
    await scoreHeader.click()
    await scoreHeader.click()

    await expect(scoreHeader).toContainText('▼')

    const names = page.locator('tbody tr td:first-child')
    await expect(names.nth(0)).toHaveText('Alice')   // 95.5
    await expect(names.nth(1)).toHaveText('Diana')   // 91.2
    await expect(names.nth(2)).toHaveText('Bob')     // 82
    await expect(names.nth(3)).toHaveText('Charlie') // 78.3
  })

  // TC-09
  test('third click clears sort and restores original order', async ({ page }) => {
    const scoreHeader = page.locator('thead th button', { hasText: 'Score' })
    await scoreHeader.click()
    await scoreHeader.click()
    await scoreHeader.click()

    await expect(scoreHeader).not.toContainText('▲')
    await expect(scoreHeader).not.toContainText('▼')

    // Original CSV order
    const names = page.locator('tbody tr td:first-child')
    await expect(names.nth(0)).toHaveText('Alice')
    await expect(names.nth(1)).toHaveText('Bob')
    await expect(names.nth(2)).toHaveText('Charlie')
    await expect(names.nth(3)).toHaveText('Diana')
  })

  // TC-10
  test('text column sorts alphabetically ascending', async ({ page }) => {
    const cityHeader = page.locator('thead th button', { hasText: 'City' })
    await cityHeader.click()

    await expect(cityHeader).toContainText('▲')

    const names = page.locator('tbody tr td:first-child')
    await expect(names.nth(0)).toHaveText('Charlie') // Bangalore
    await expect(names.nth(1)).toHaveText('Diana')   // Chennai
    await expect(names.nth(2)).toHaveText('Bob')     // Delhi
    await expect(names.nth(3)).toHaveText('Alice')   // Mumbai
  })

  // TC-24
  test('sort order is preserved when search filters rows', async ({ page }) => {
    const scoreHeader = page.locator('thead th button', { hasText: 'Score' })
    await scoreHeader.click() // ascending

    await page.locator('input[type="search"]').fill('a') // Alice, Charlie, Diana
    await expect(page.getByText('3 of 4 rows')).toBeVisible()

    const names = page.locator('tbody tr td:first-child')
    await expect(names).toHaveCount(3)
    await expect(names.nth(0)).toHaveText('Charlie') // 78.3
    await expect(names.nth(1)).toHaveText('Diana')   // 91.2
    await expect(names.nth(2)).toHaveText('Alice')   // 95.5
  })
})

test.describe('sort — XLSX dates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await loadFile(page, FIXTURES.preamble)
    await page.getByText('2 of 2 rows').waitFor()
  })

  // TC-22
  test('date column sorts chronologically', async ({ page }) => {
    const dateHeader = page.locator('thead th button', { hasText: 'Txn Date' })

    await dateHeader.click()
    await expect(dateHeader).toContainText('▲')
    const rows = page.locator('tbody tr')
    await expect(rows.nth(0)).toContainText('Payment Received') // Oct 29 (earlier)
    await expect(rows.nth(1)).toContainText('Payment Sent')     // Nov 6 (later)

    await dateHeader.click()
    await expect(dateHeader).toContainText('▼')
    await expect(rows.nth(0)).toContainText('Payment Sent')     // Nov 6 (later = first)
    await expect(rows.nth(1)).toContainText('Payment Received') // Oct 29 (earlier = second)
  })
})
