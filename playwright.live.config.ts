import { defineConfig, devices } from '@playwright/test'

/**
 * Audits the deployed site itself. Kept apart from the normal suite so a
 * routine `npm run e2e` never depends on production being up, and so CI does
 * not hammer the live origin on every push. Run it after a deploy:
 *   npm run e2e:live
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: 'live.spec.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [['list']],
  use: { trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
