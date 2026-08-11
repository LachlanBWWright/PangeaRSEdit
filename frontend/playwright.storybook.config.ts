import { defineConfig } from "@playwright/test";

export default defineConfig({
  timeout: 120_000,
  testDir: "./tests/storybook",
  testMatch: [
    "**/*Accessibility.spec.ts",
    "**/*Overflow.spec.ts",
    "**/*Interactions.spec.ts",
  ],
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  expect: {
    timeout: 30_000,
  },
  use: {
    baseURL: "http://127.0.0.1:6006",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm run storybook --ci --no-open",
    url: "http://127.0.0.1:6006",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
