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
  webServer: [
    {
      command: 'npx vite preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      // Never reuse. A `vite preview` left running from an earlier build serves
      // that build, and the suite passes against code that is no longer there —
      // which is exactly how a run of 84 green tests was reported against a
      // stale dist while CI, building fresh, failed fifteen. If something else
      // is holding the port, failing to start is the right answer.
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      // The dev server, for one spec only: the mini-game shell is walked end
      // to end against a game that is barely a game (src/games/mock.ts), and
      // that game must not exist in a built bundle. It is behind
      // `import.meta.env.DEV`, so this is the only server that has it.
      command: 'npx vite --port 4174 --strictPort',
      url: 'http://localhost:4174',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      // Both, because a project's own `testIgnore` replaces the top-level one
      // rather than adding to it — which is how the live-origin audit, which
      // hits production and is meant to run from its own config, started
      // running here and failing against a build that is not this one.
      testIgnore: [/live\.spec\.ts/, /gameshell\.spec\.ts/],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // The shell, against the dev server, because that is where the mock
      // game exists. Everything else runs against the built bundle.
      name: 'shell',
      testMatch: /gameshell\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4174' },
    },
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
