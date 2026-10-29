import { defineConfig } from "@playwright/test";

export default defineConfig({ testDir: "tests/e2e", timeout: 90_000, workers: 1,
  outputDir: process.env.PANGEA_ELECTRON_PACKAGED === "1" ? "test-results/packaged" : "test-results/source",
  use: { trace: "retain-on-failure" }, reporter: "list" });
