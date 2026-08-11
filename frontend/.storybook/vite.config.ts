import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const storybookDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  publicDir: false,
  resolve: {
    alias: {
      "@": path.resolve(storybookDirectory, "../src"),
    },
  },
});
