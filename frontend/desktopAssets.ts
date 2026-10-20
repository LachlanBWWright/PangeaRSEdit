import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

export function desktopAssets(publicRoot: string): Plugin {
  return { name: "desktop-lightweight-assets", apply: "build", buildStart() {
    const root = path.join(publicRoot, "data");
    for (const file of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
      if (!file.isFile()) continue;
      const source = path.join(file.parentPath, file.name);
      this.emitFile({ type: "asset", fileName: `data/${path.relative(root, source).split(path.sep).join("/")}`, source: fs.readFileSync(source) });
    }
    this.emitFile({ type: "asset", fileName: "favicon.ico", source: fs.readFileSync(path.join(publicRoot, "favicon.ico")) });
  } };
}
