import { build } from "esbuild";

await build({
  entryPoints: { main: "src/main.ts", preload: "src/preload.ts" },
  bundle: true, platform: "node", format: "cjs", target: "node22",
  external: ["electron"], outdir: "dist", outExtension: { ".js": ".cjs" },
});
