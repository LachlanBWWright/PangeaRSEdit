import { defineConfig } from "vitest/config";
import path from "path";

const broadInclude = [
  "src/**/*.test.ts",
  "src/**/*.test.tsx",
  "tests/**/*.test.ts",
  "tests/**/*.test.tsx",
];

export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    dir: import.meta.dirname,
    testTimeout: 120000,
    include: broadInclude,
    exclude: [
      "tests/e2e/**",
      "tests/**/levels/**",
      "src/modelParsers/parseMightyMikeRoundtrip.test.ts",
      "src/modelParsers/skeletonValueValidation.test.ts",
      "src/modelParsers/bg3dSkeleton.test.ts",
      "src/modelParsers/bg3dSkeletonRoundTrip.test.ts",
      "src/modelParsers/mightyMikePaletteCompare.test.ts",
      "src/modelParsers/multiRoundtripComparison.test.ts",
      "src/validation/levelDataSchemas.test.ts",
      "**/node_modules/**",
      "**/dist/**",
      "coverage/**",
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
      reporter: ["text", "html", "json", "json-summary", "lcov"],
      enabled: true,
      clean: true,
      include: ["src/**/*.{js,ts,jsx,tsx}"],
      exclude: [
        "**/*.test.*",
        "**/*.stories.*",
        "**/*.generated.*",
        "**/*.d.ts",
        "**/coverage/**",
        "**/dist/**",
        "**/node_modules/**",
        "**/fixtures/**",
        "**/__fixtures__/**",
        "editor/subviews/mightymike/mightyMikeTrackSegments.ts",
        "tests/**",
      ],
    },
  },
});
