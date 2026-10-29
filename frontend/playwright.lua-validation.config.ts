import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "luaValidationWorker.spec.ts",
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:5200/PangeaRSEdit/",
    headless: true,
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
  },
  webServer: {
    command: "pnpm exec vite --host 127.0.0.1 --port 5200 --strictPort",
    url: "http://127.0.0.1:5200/PangeaRSEdit/",
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_RUNTIME_SERVER === "1",
  },
});
