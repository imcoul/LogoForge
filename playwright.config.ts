import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration — mobile-first.
 *
 * The primary project is a phone viewport, because Forgel is a mobile-first tool and
 * regressions there matter most. A desktop project runs the same specs for parity.
 *
 * Every spec in `testDir` runs. Two speculative specs that had never been run — they targeted
 * roughly twenty selectors that do not exist in the app — were removed rather than carried as
 * a permanently red gate; the navigation and PWA flows in `mobile-smoke.spec.ts` replace them
 * with assertions against UI that actually exists.
 */
/**
 * Some environments (CI images, dev containers) ship a pre-installed Chromium whose build
 * number does not match this Playwright release. Point at it explicitly via
 * PLAYWRIGHT_CHROMIUM_EXECUTABLE rather than downloading a second copy. When the variable is
 * unset, Playwright resolves its own bundled browser as usual.
 */
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const chromiumLaunchOptions = chromiumExecutable
  ? { executablePath: chromiumExecutable }
  : undefined;

export default defineConfig({
  testDir: './e2e-tests',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // The sandbox has no outbound network; Firebase calls fail and are caught by the app.
    offline: false,
  },

  projects: [
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
        launchOptions: chromiumLaunchOptions,
      },
    },
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: chromiumLaunchOptions,
      },
    },
  ],

  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
