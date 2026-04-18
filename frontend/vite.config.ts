import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import fs from "node:fs";
import path from "node:path";
import type { Plugin, ViteDevServer } from "vite";

// https://vitejs.dev/config/
const repoRoot = path.resolve(__dirname, "..");
const pangeaPortsSrcDir = path.resolve(repoRoot, "games/pangea-ports");
const pangeaPortsSrcGamesDir = path.resolve(pangeaPortsSrcDir, "games");
const pangeaPortsDistDir = path.resolve(__dirname, "dist/games/pangea-ports");
const pangeaPortsDistGamesDir = path.resolve(pangeaPortsDistDir, "games");
const pangeaPortsMount = "/games/pangea-ports";

function mimeTypeFor(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".ico":
      return "image/x-icon";
    case ".wasm":
      return "application/wasm";
    case ".md":
      return "text/markdown; charset=utf-8";
    case ".pdf":
      return "application/pdf";
    case ".tga":
      return "application/octet-stream";
    default:
      return "application/octet-stream";
  }
}

function isInsideDir(dir: string, target: string): boolean {
  const relative = path.relative(dir, target);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function serveStaticDirectory(basePath: string, rootDir: string): Plugin {
  return {
    name: "serve-static-directory",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const requestUrl = req.url ? new URL(req.url, "http://localhost") : null;
        if (!requestUrl || !requestUrl.pathname.startsWith(basePath)) {
          next();
          return;
        }

        let relativePath = decodeURIComponent(requestUrl.pathname.slice(basePath.length));
        if (!relativePath || relativePath === "/") {
          relativePath = "/index.html";
        }

        let targetPath = path.resolve(rootDir, `.${relativePath}`);
        if (!isInsideDir(rootDir, targetPath)) {
          next();
          return;
        }

        try {
          const stats = fs.statSync(targetPath);
          if (stats.isDirectory()) {
            targetPath = path.join(targetPath, "index.html");
          }
          if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
            next();
            return;
          }
          res.statusCode = 200;
          res.setHeader("Content-Type", mimeTypeFor(targetPath));
          fs.createReadStream(targetPath).pipe(res);
        } catch {
          next();
        }
      });
    },
    closeBundle() {
      fs.rmSync(pangeaPortsDistDir, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(pangeaPortsDistGamesDir), { recursive: true });
      fs.cpSync(pangeaPortsSrcGamesDir, pangeaPortsDistGamesDir, { recursive: true });
    },
  };
}

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
  build: {
    target: "es2022",
  },
  esbuild: {
    target: "es2022",
  },
  server: {
    watch: {
      ignored: [
        "**/_codeql_detected_source_root",
        "**/_codeql_detected_source_root/**",
      ],
    },
    fs: {
      allow: [repoRoot],
    },
  },
  plugins: [react(), serveStaticDirectory(pangeaPortsMount, pangeaPortsSrcDir)],
  worker: { format: "es" },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: "buffer/",
    },
  },
  define: {
    "global.Buffer": ["buffer", "Buffer"],
  },
  base: "/PangeaRSEdit/",

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
