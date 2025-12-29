import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: [
    "**/*.ter.rsrc",
    "**/*.ter",
    "**/*.trt",
    "**/*.tileset",
    "**/*.map-1",
    "**/*.map-2",
    "**/*.map-3",
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022",
    },
  },
  plugins: [react()],
  worker: { format: "es" },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: "buffer/",
      // Stub out Node.js modules that rsrcdump-ts imports but doesn't use in browser
      "fs/promises": path.resolve(__dirname, "./src/utils/fs-stub.ts"),
    },
  },
  define: {
    "global.Buffer": ["buffer", "Buffer"],
  },
  base: "/PangeaRSEdit/",
  build: {
    target: "es2022",
  },
  esbuild: {
    target: "es2022",
  },

  test: {
    setupFiles: ["./vitest.setup.ts"],
    environment: "jsdom",
    deps: {
      optimizer: {
        web: {
          include: ["vitest-canvas-mock"],
        },
      },
    },
  },
});
