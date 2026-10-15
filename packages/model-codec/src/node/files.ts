import type { Stats } from "node:fs";
import { mkdir, lstat, realpath, stat } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { err, ok, okAsync, ResultAsync } from "neverthrow";
import { z } from "zod";
import { boundaryMessage, external } from "./boundaries";
import type { OutputFile } from "./gltf";
import { writeTransaction, type PreparedOutput } from "./outputTransaction";

interface InputIdentity { readonly path: string; readonly info: Stats | null; }

function optionalFileInfo(path: string, followLinks = false): ResultAsync<Stats | null, string> {
  return ResultAsync.fromPromise(followLinks ? stat(path) : lstat(path), (error: unknown) => {
    const parsed = z.object({ code: z.string() }).safeParse(error);
    return { missing: parsed.success && parsed.data.code === "ENOENT", message: boundaryMessage(error) };
  }).map((info): Stats | null => info)
    .orElse((error) => error.missing ? ok(null) : err(error.message));
}

function inputIdentity(path: string): ResultAsync<InputIdentity, string> {
  return optionalFileInfo(path, true).andThen((info) => info
    ? external(() => realpath(path)).map((canonical): InputIdentity => ({ path: canonical, info }))
    : ok<InputIdentity, string>({ path: resolve(path), info }));
}

function prepareOutput(file: OutputFile, inputs: readonly InputIdentity[], force: boolean): ResultAsync<PreparedOutput, string> {
  return external(() => mkdir(dirname(file.path), { recursive: true }))
    .andThen(() => external(() => realpath(dirname(file.path))))
    .andThen((parent) => optionalFileInfo(file.path).andThen((info) => {
      const canonical = join(parent, basename(file.path));
      if (info?.isSymbolicLink()) return err(`Output must not be a symbolic link: ${file.path}`);
      if (inputs.some((input) => input.path === canonical || (info && input.info && info.dev === input.info.dev && info.ino === input.info.ino)))
        return err(`Output would overwrite an input file: ${file.path}`);
      if (info && (!info.isFile() || !force)) return err(`Output already exists: ${file.path}. Use --force to overwrite files.`);
      return ok({ ...file, path: canonical, original: info });
    }));
}

export function writeOutputFiles(files: readonly OutputFile[], inputs: readonly string[], force: boolean): ResultAsync<readonly string[], string> {
  return ResultAsync.combine(inputs.map(inputIdentity)).andThen((identities) =>
    files.reduce<ResultAsync<readonly PreparedOutput[], string>>((result, file) => result.andThen((prepared) =>
      prepareOutput(file, identities, force).andThen((output) => prepared.some((previous) => previous.path === output.path)
        ? err(`Duplicate output destination: ${file.path}`) : ok([...prepared, output]))), okAsync([])))
    .andThen(writeTransaction)
    .map(() => files.map((file) => file.path));
}
