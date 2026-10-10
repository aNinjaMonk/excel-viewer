import { test, expect } from '@playwright/test'
import { loadCsv } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await loadCsv(page)
  // Select Alice's row before each delete test
  await page.locator('tbody tr', { hasText: 'Alice' }).locator('input[type="checkbox"]').check()
})

// TC-16
test('delete dialog opens with row preview', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete 1 row' }).click()

  const dialog = page.locator('dialog[open]')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Delete 1 row?' })).toBeVisible()

  // Preview shows Alice's data (first 3 columns: Name, Age, City)
  await expect(dialog).toContainText('Name')
  await expect(dialog).toContainText('Alice')
  await expect(dialog).toContainText('Mumbai')

  // Both buttons present
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Delete 1 row' })).toBeVisible()
})

// TC-17
test('cancel button closes dialog and preserves selection', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete 1 row' }).click()
  await page.locator('dialog[open]').getByRole('button', { name: 'Cancel' }).click()

  await expect(page.locator('dialog[open]')).not.toBeVisible()
  // Scope to .table-wrap to exclude the dialog's own preview table (still in DOM when closed)
  await expect(page.locator('.table-wrap tbody tr')).toHaveCount(4)
  // Alice's row still selected
  await expect(page.getByText('1 selected')).toBeVisible()
})

// TC-18
test('Escape key closes dialog without deleting', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete 1 row' }).click()
  await page.keyboard.press('Escape')

  await expect(page.locator('dialog[open]')).not.toBeVisible()
  await expect(page.locator('.table-wrap tbody tr')).toHaveCount(4)
})

// TC-19
test('clicking backdrop closes dialog without deleting', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete 1 row' }).click()
  const dialog = page.locator('dialog[open]')
  await expect(dialog).toBeVisible()

  // Click in the top-left corner of the viewport — outside the dialog box
  await page.mouse.click(10, 10)

  await expect(dialog).not.toBeVisible()
  await expect(page.locator('.table-wrap tbody tr')).toHaveCount(4)
})

// TC-20
test('confirming delete triggers download and updates table', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete 1 row' }).click()

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('dialog[open]').getByRole('button', { name: 'Delete 1 row' }).click(),
  ])

  // File was downloaded
  expect(download.suggestedFilename()).toBe('basic.csv')

  // Table updated: Alice gone, 3 rows remain
  await expect(page.locator('.table-wrap tbody tr')).toHaveCount(3)
  await expect(page.locator('.table-wrap tbody tr', { hasText: 'Alice' })).toHaveCount(0)
  await expect(page.locator('.table-wrap tbody tr', { hasText: 'Bob' })).toBeVisible()

  // Selection cleared
  await expect(page.getByText('selected')).not.toBeVisible()

  // Notice shown
  await expect(page.locator('.notice')).toContainText("Deleted 1 row")
  await expect(page.locator('.notice')).toContainText("updated file was downloaded")
})
