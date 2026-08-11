import { defineConfig } from "@playwright/test";
import storybookConfig from "./playwright.storybook.config";

export default defineConfig({
  ...storybookConfig,
  testMatch: "**/*Screenshots.spec.ts",
  use: {
    ...storybookConfig.use,
    trace: "off",
  },
});
