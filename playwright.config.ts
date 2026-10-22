import { defineConfig, devices } from '@playwright/test';

const baseURL =
  process.env.E2E_BASE_URL ??
  (process.env.E2E_SERVE === '1' ? 'http://127.0.0.1:4173' : 'https://localgo-sit-616.pages.dev');

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 45_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile-375',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 375, height: 800 },
      },
    },
    {
      name: 'mobile-320',
      use: {
        viewport: { width: 320, height: 800 },
      },
    },
  ],
  webServer:
    process.env.E2E_SERVE === '1'
      ? {
          command: 'npx serve dist/localgo/browser -l 4173',
          url: 'http://127.0.0.1:4173',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        }
      : undefined,
});
