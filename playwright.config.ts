import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5010';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  webServer: {
    command: `bun run dev -- --host 127.0.0.1 --port ${new URL(baseURL).port || '5010'}`,
    url: `${baseURL}/api/health`,
    env: { NUXT_SQLITE_PATH: resolve('.data/playwright.sqlite') },
    reuseExistingServer: false,
    timeout: 60000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
