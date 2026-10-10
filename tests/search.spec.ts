import { test, expect } from '@playwright/test'
import { loadCsv } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await loadCsv(page)
})

// TC-04
test('search filters rows case-insensitively', async ({ page }) => {
  await page.locator('input[type="search"]').fill('alice')
  await expect(page.getByText('1 of 4 rows')).toBeVisible()

  const rows = page.locator('tbody tr')
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('Alice')
  await expect(rows.first()).toContainText('Mumbai')
})

// TC-05
test('search with no match shows empty state', async ({ page }) => {
  await page.locator('input[type="search"]').fill('xyznonexistent')
  await expect(page.getByText('0 of 4 rows')).toBeVisible()
  await expect(page.getByText('No matching rows')).toBeVisible()
})

// TC-06
test('clearing search restores all rows', async ({ page }) => {
  const search = page.locator('input[type="search"]')
  await search.fill('alice')
  await expect(page.getByText('1 of 4 rows')).toBeVisible()

  await search.fill('')
  await expect(page.getByText('4 of 4 rows')).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(4)
})
