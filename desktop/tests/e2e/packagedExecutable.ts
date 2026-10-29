import path from "node:path";
import { err, ok } from "neverthrow";
import { failure, statOrMissing } from "../../src/files.ts";

export async function packagedExecutable(directory: string) {
  const candidates = process.platform === "darwin"
    ? [`mac${process.arch === "arm64" ? "-arm64" : ""}/Pangea RS Edit.app/Contents/MacOS/pangea-rs-edit`,
      `mac${process.arch === "arm64" ? "-arm64" : ""}/Pangea RS Edit.app/Contents/MacOS/Pangea RS Edit`]
    : process.platform === "win32" ? ["win-unpacked/pangea-rs-edit.exe"] : ["linux-unpacked/pangea-rs-edit"];
  for (const candidate of candidates) {
    const location = path.resolve(directory, candidate);
    const info = await statOrMissing(location);
    if (info.isErr()) return err(info.error);
    if (info.value?.isFile()) return ok(location);
  }
  return err(failure("Packaged executable not found. Run pnpm --dir desktop package first.", "missing-package"));
}
