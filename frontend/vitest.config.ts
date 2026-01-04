import { defineConfig } from "vitest/config";

export default defineConfig({
  root: import.meta.dirname,
  test: {
    dir: import.meta.dirname,
    include: ["tests/roundtrip/allGamesRoundtripNew.test.ts", "tests/roundtrip/mightyMikeRoundtrip.test.ts"],
    exclude: [
      "tests/e2e/**",
      "src/modelParsers/**/parseMightyMikeRoundtrip.test.ts",
      "src/modelParsers/**/skeletonValueValidation.test.ts",
      "src/utils/gltfAnalyzer.test.ts",
      "src/utils/lzss.test.ts",
      "src/validation/levelDataSchemas.test.ts",
      "tests/mapRoundtrip/levels/**",
      "src/modelParsers/bg3dSkeleton.test.ts",
      "src/modelParsers/bg3dSkeletonRoundTrip.test.ts",
      "src/modelParsers/mightyMikePaletteCompare.test.ts",
      "src/modelParsers/multiRoundtripComparison.test.ts",
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
