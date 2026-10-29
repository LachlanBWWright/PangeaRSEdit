import { defineConfig, devices } from "@playwright/test";
import { z } from "zod";

const parsedPort = z.coerce.number().int().min(1024).max(65535).safeParse(process.env.PANGEA_RUNTIME_PORT ?? "5199");
const runtimePort = parsedPort.success ? parsedPort.data : 5199;
const runtimeUrl = `http://127.0.0.1:${runtimePort}/PangeaRSEdit/`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: [
    "scriptingRuntimeLaunch.spec.ts",
    "customItemRuntime.spec.ts",
    "scriptingPersistenceRestart.spec.ts",
    "runtimeStartup.spec.ts",
    "runtimeReloadAcceptance.spec.ts",
    "packageCustomObjectAcceptance.spec.ts",
    "runtimeStreamingProgressAcceptance.spec.ts",
    "luaValidationWorker.spec.ts",
    "**/gameCoverage/*.spec.ts",
  ],
  outputDir: process.env.PANGEA_RUNTIME_RESULTS ?? "test-results",
  workers: 1,
  timeout: 120000,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: runtimeUrl,
    headless: true,
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
  },
  webServer: {
    command: `pnpm exec vite --host 127.0.0.1 --port ${runtimePort} --strictPort`,
    url: runtimeUrl,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_RUNTIME_SERVER === "1",
  },
});
