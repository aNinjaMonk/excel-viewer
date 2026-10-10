import { test, expect } from '@playwright/test'
import { loadCsv } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await loadCsv(page)
})

// TC-11
test('selecting a row shows toolbar and indeterminate header checkbox', async ({ page }) => {
  const rowCheckboxes = page.locator('tbody input[type="checkbox"]')
  await rowCheckboxes.first().check()

  await expect(page.getByText('1 selected')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete 1 row' })).toBeVisible()

  // Header checkbox indeterminate
  const headerCheckbox = page.locator('thead input[type="checkbox"]')
  await expect(headerCheckbox).toHaveJSProperty('indeterminate', true)
})

// TC-12
test('header checkbox selects all rows', async ({ page }) => {
  // Select one first to put header into indeterminate state
  await page.locator('tbody input[type="checkbox"]').first().check()
  await page.locator('thead input[type="checkbox"]').check()

  await expect(page.getByText('4 selected')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete 4 rows' })).toBeVisible()

  const headerCheckbox = page.locator('thead input[type="checkbox"]')
  await expect(headerCheckbox).toBeChecked()
  await expect(headerCheckbox).toHaveJSProperty('indeterminate', false)
})

// TC-13
test('unchecking header checkbox deselects all rows', async ({ page }) => {
  // Select all
  await page.locator('tbody input[type="checkbox"]').first().check()
  await page.locator('thead input[type="checkbox"]').check()
  await expect(page.getByText('4 selected')).toBeVisible()

  // Deselect all
  await page.locator('thead input[type="checkbox"]').uncheck()

  await expect(page.getByText('selected')).not.toBeVisible()
  await expect(page.getByRole('button', { name: /Delete/ })).not.toBeVisible()
  const rowCheckboxes = page.locator('tbody input[type="checkbox"]')
  for (let i = 0; i < 4; i++) {
    await expect(rowCheckboxes.nth(i)).not.toBeChecked()
  }
})

// TC-14
test('clear button deselects all rows', async ({ page }) => {
  const rowCheckboxes = page.locator('tbody input[type="checkbox"]')
  await rowCheckboxes.nth(0).check()
  await rowCheckboxes.nth(1).check()
  await expect(page.getByText('2 selected')).toBeVisible()

  await page.getByRole('button', { name: 'Clear' }).click()

  await expect(page.getByText('selected')).not.toBeVisible()
  await expect(rowCheckboxes.nth(0)).not.toBeChecked()
  await expect(rowCheckboxes.nth(1)).not.toBeChecked()
})

// TC-15
test('select all when filtered only selects visible rows', async ({ page }) => {
  // Filter to 3 rows (Alice, Charlie, Diana match "a")
  await page.locator('input[type="search"]').fill('a')
  await expect(page.getByText('3 of 4 rows')).toBeVisible()

  await page.locator('thead input[type="checkbox"]').check()
  await expect(page.getByText('3 selected')).toBeVisible()

  // Clear search — Bob should be unchecked
  await page.locator('input[type="search"]').fill('')
  await expect(page.getByText('4 of 4 rows')).toBeVisible()

  // Still shows 3 selected (Bob not included)
  await expect(page.getByText('3 selected')).toBeVisible()

  // Find Bob's row and verify its checkbox is unchecked
  const bobRow = page.locator('tbody tr', { hasText: 'Bob' })
  await expect(bobRow.locator('input[type="checkbox"]')).not.toBeChecked()
})
