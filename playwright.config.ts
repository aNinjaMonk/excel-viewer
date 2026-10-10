import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  globalSetup: './tests/global-setup.ts',
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    headless: true,
  },
  webServer: {
    command: 'npm run dev -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
})
