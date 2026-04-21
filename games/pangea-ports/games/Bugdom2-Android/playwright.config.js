// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/playwright',
  timeout: 30_000,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: process.env.DOCS_BASE_URL || 'http://localhost:8765',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Reuse existing server if already running; start it if not
  webServer: {
    command: 'python3 -m http.server 8765 --directory docs',
    url: 'http://localhost:8765',
    reuseExistingServer: true,
    timeout: 10_000,
  },
});
