import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ["pyodide"],
  },
  plugins: [react()],
  base: "/PangeaRSEdit/",
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
