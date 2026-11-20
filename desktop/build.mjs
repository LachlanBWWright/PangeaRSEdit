import { build } from "esbuild";
import { access, cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

await build({
  entryPoints: { main: "src/main.ts", preload: "src/preload.ts" },
  bundle: true, platform: "node", format: "cjs", target: "node22",
  external: ["electron", "sharp"], outdir: "dist", outExtension: { ".js": ".cjs" },
});

const platform = { linux: "linux", darwin: "darwin", win32: "windows" }[process.platform];
const architectures = { x64: ["x86_64", "amd64"], arm64: ["arm64", "aarch64"] }[process.arch] ?? [process.arch];
const candidates = architectures.flatMap((architecture) => {
  const artifact = `PangeaSandbox-${platform}-${architecture}`;
  return [path.resolve("../games/pangea-ports/games/PangeaSandbox/dist", artifact)];
});
if (process.env.PANGEA_ENGINE_DIRECTORY) candidates.splice(0, candidates.length, path.resolve(process.env.PANGEA_ENGINE_DIRECTORY));
await mkdir("dist-native", { recursive: true });
await rm("dist-native/engine", { recursive: true, force: true });
let staged = false;
for (const candidate of candidates) {
  const executable = path.join(candidate, process.platform === "win32" ? "PangeaSandbox.exe" : "PangeaSandbox");
  const available = await access(executable).then(() => true, () => false);
  if (!available) continue;
  await mkdir("dist-native/engine", { recursive: true });
  for (const entry of await readdir(candidate, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    if (entry.name === "licenses" || entry.name === path.basename(executable) || /\.(so(?:\.[0-9.]+)?|dylib|dll)$/.test(entry.name))
      await cp(path.join(candidate, entry.name), path.join("dist-native/engine", entry.name), { recursive: true });
  }
  console.log(`Staged optional native Lua Engine from ${candidate}`);
  staged = true;
  break;
}
if (!staged) {
  console.error("Native Lua Engine was not staged. Build PangeaSandbox with --package, or set PANGEA_ENGINE_DIRECTORY to its distribution folder.");
  if (process.argv.includes("--require-engine") || process.env.PANGEA_REQUIRE_ENGINE === "1") process.exitCode = 1;
}
