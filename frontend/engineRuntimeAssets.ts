import fs from "node:fs";
import path from "node:path";
import { ok, Result } from "neverthrow";

export function engineRuntimeAssets(publicRoot: string) {
  const relative = "generated/pangea-ports/wasm/sandbox";
  const root = path.join(publicRoot, relative);
  if (!fs.existsSync(root)) return ok([]);
  return Result.fromThrowable(() => ["html", "js", "wasm", "data", "host.js", "ui.css"].map((extension) => {
    const name = `PangeaSandbox.${extension}`;
    return { fileName: `${relative}/${name}`, source: fs.readFileSync(path.join(root, name)) };
  }), () => "The Lua engine runtime is incomplete. Run scripts/build-games.sh --game sandbox before packaging its preview.")();
}
