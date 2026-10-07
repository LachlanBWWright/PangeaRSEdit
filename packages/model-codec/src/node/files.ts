import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { err, errAsync, ok, okAsync, ResultAsync } from "neverthrow";
import { z } from "zod";
import { boundaryMessage, external } from "./boundaries";
import type { OutputFile } from "./gltf";

function outputAvailable(path: string, force: boolean): ResultAsync<void, string> {
  return ResultAsync.fromPromise(stat(path), (error: unknown) => {
    const parsed = z.object({ code: z.string() }).safeParse(error);
    return { code: parsed.success ? parsed.data.code : "unknown", message: boundaryMessage(error) };
  }).andThen((info) => info.isFile() && force ? ok(undefined) : err({ code: "exists", message: `Output already exists: ${path}. Use --force to overwrite files.` }))
    .orElse((error) => error.code === "ENOENT" ? ok(undefined) : err(error.message));
}

export function writeOutputFiles(files: readonly OutputFile[], inputs: readonly string[], force: boolean): ResultAsync<readonly string[], string> {
  const inputPaths = new Set(inputs.map((path) => resolve(path)));
  const outputPaths = new Set<string>();
  for (const file of files) {
    const path = resolve(file.path);
    if (inputPaths.has(path)) return errAsync(`Output would overwrite an input file: ${path}`);
    if (outputPaths.has(path)) return errAsync(`Duplicate output destination: ${path}`);
    outputPaths.add(path);
  }
  return files.reduce<ResultAsync<void, string>>((result, file) => result.andThen(() => outputAvailable(file.path, force)), okAsync(undefined))
    .andThen(() => files.reduce<ResultAsync<void, string>>((result, file) => result
      .andThen(() => external(() => mkdir(dirname(file.path), { recursive: true })))
      .andThen(() => external(() => writeFile(file.path, file.bytes, { flag: force ? "w" : "wx" }))), okAsync(undefined)))
    .map(() => files.map((file) => file.path));
}
