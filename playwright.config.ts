import { defineConfig, devices } from '@playwright/test'

/**
 * Real-browser checks for the things a unit test cannot answer: whether a drag
 * actually moves the room, whether the wheel and the keys do, and whether the
 * camera stops at the walls. Screenshots land in e2e/shots/.
 */
export default defineConfig({
  testDir: './e2e',
  // The live-origin audit hits production; it runs from its own config.
  testIgnore: 'live.spec.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    // Point the same suite at a deployed origin with E2E_ORIGIN.
    baseURL: process.env['E2E_ORIGIN'] ?? 'http://localhost:4173',
    trace: 'off',
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // The outline is geometry, and geometry is where engines disagree; the
    // camera tests stay on one engine because they are about input, not paint.
    // What the first frame shows is the other cross-engine question — the
    // entrance plate is preloaded per orientation, and engines pick differently.
    {
      name: 'webkit',
      testMatch: /(outline|first-paint)\.spec\.ts/,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'firefox',
      testMatch: /(outline|first-paint)\.spec\.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
  ],
})
