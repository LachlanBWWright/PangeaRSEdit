/// <reference types="vitest/config" />
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: import.meta.dirname,
  test: {
    dir: import.meta.dirname,
    include: [
      "src/**/*.test.{ts,tsx,js,jsx}",
      "src/**/*.spec.{ts,tsx,js,jsx}",
      "tests/**/*.test.{ts,tsx,js,jsx}",
      "tests/**/*.spec.{ts,tsx,js,jsx}",
    ],
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],

    // If you rely on vite-node/module-runner, inline runtime deps here
    server: {
      deps: {
        inline: ["vitest-canvas-mock"],
      },
    },

    // Optimize client side deps for modern Vitest (optimizer.client)
    deps: {
      optimizer: {
        client: {
          include: ["vitest-canvas-mock"],
        },
      },
    },

    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      enabled: true,
      include: ["src/**/*.{js,ts,jsx,tsx}"],
      exclude: ["**/node_modules/**", "**/dist/**", "tests/**"],
    },
  },
});
