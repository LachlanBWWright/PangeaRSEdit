import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: ["**/*.ter.rsrc", "**/*.ter", "**/*.trt"],
  optimizeDeps: {
    exclude: ["pyodide"],
    esbuildOptions: {
      target: "es2022",
    },
  },
  plugins: [react()],
  worker: { format: "es" },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
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
      // vitest < 0.34
      inline: ["vitest-canvas-mock"],
      // >= 0.34
      optimizer: {
        web: {
          include: ["vitest-canvas-mock"],
        },
      },
    },
  },
});
