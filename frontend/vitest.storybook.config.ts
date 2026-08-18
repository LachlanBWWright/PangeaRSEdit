import path from "node:path";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const mightyMikeRaceCarFixture = path.resolve(
  import.meta.dirname,
  ".storybook/fixtures/mightyMikeRaceCar.c",
);

export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      "@audio/decode-aiff",
      "@gltf-transform/core",
      "@gltf-transform/functions",
      "@lachlanbwwright/rsrcdump-ts",
      "@microsoft/signalr",
      "@monaco-editor/react",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-progress",
      "@react-three/drei",
      "@react-three/fiber",
      "@storybook/react-dom-shim",
      "buffer",
      "embla-carousel-react",
      "fflate",
      "gltf-validator",
      "immer",
      "jpeg-js",
      "jotai",
      "monaco-editor",
      "pngjs/browser",
      "react-konva",
      "react-resizable-panels",
      "react-router-dom",
      "react/jsx-dev-runtime",
      "three",
      "three/examples/jsm/exporters/GLTFExporter.js",
      "three/examples/jsm/loaders/GLTFLoader.js",
      "three/examples/jsm/utils/SkeletonUtils.js",
      "use-immer",
    ],
  },
  plugins: [
    {
      name: "storybook-mighty-mike-source-fixture",
      enforce: "pre",
      resolveId(source: string) {
        return source.endsWith("games/mightymike/src/Enemies/Bargain/RaceCar.c?raw")
          ? `${mightyMikeRaceCarFixture}?raw`
          : null;
      },
    },
    storybookTest({
      configDir: path.resolve(import.meta.dirname, ".storybook"),
    }),
  ],
  test: {
    name: "storybook",
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({}),
      instances: [{ browser: "chromium" }],
    },
    coverage: {
      provider: "v8",
      enabled: false,
      clean: true,
      reportsDirectory: "./coverage-storybook",
      reporter: ["text", "html", "json", "json-summary", "lcov"],
      include: ["src/**/*.{js,ts,jsx,tsx}"],
      exclude: [
        "**/*.test.*",
        "**/*.stories.*",
        "**/*.generated.*",
        "**/*.d.ts",
        "**/fixtures/**",
        "**/__fixtures__/**",
      ],
    },
  },
});
