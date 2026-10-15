import type { Stats } from "node:fs";
import { link, lstat, mkdtemp, rename, rm, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { err, errAsync, ok, okAsync, ResultAsync } from "neverthrow";
import { external } from "./boundaries";
import type { OutputFile } from "./gltf";

export interface PreparedOutput extends OutputFile { readonly original: Stats | null; }
interface StagedOutput {
  readonly output: PreparedOutput;
  readonly directory: string;
  readonly staged: string;
  readonly backup: string;
  backedUp: boolean;
  installed: boolean;
}

function stage(output: PreparedOutput, staged: StagedOutput[]): ResultAsync<void, string> {
  return external(() => mkdtemp(join(dirname(output.path), ".pangea-export-"))).andThen((directory) => {
    const item = { output, directory, staged: join(directory, "output"), backup: join(directory, "backup"), backedUp: false, installed: false };
    staged.push(item);
    return external(() => writeFile(item.staged, output.bytes, { flag: "wx" }));
  });
}

function publish(item: StagedOutput): ResultAsync<void, string> {
  const original = item.output.original;
  const backup = original ? external(() => lstat(item.output.path)).andThen((current) => {
    if (current.isSymbolicLink() || current.dev !== original.dev || current.ino !== original.ino)
      return err("Output changed while preparing export; retry the conversion.");
    return external(() => rename(item.output.path, item.backup)).map(() => { item.backedUp = true; });
  }) : okAsync(undefined);
  return backup.andThen(() => external(() => link(item.staged, item.output.path)))
    .map(() => { item.installed = true; });
}

function restore(item: StagedOutput): ResultAsync<void, string> {
  const remove = item.installed ? external(() => unlink(item.output.path)) : okAsync(undefined);
  return remove.andThen(() => item.backedUp ? external(() => link(item.backup, item.output.path)) : okAsync(undefined))
    .map(() => { item.backedUp = false; item.installed = false; });
}

function clean(staged: readonly StagedOutput[]): ResultAsync<void, string> {
  return ResultAsync.combine(staged.map((item) => external(() => rm(item.directory, { recursive: true, force: true })))).map(() => undefined);
}

function rollback(staged: readonly StagedOutput[], failure: string): ResultAsync<never, string> {
  const failures: string[] = [];
  return [...staged].reverse().reduce<ResultAsync<void, string>>((result, item) => result.andThen(() => restore(item)
    .orElse((message) => {
      const recovery = item.backedUp ? `Backup retained at ${item.backup}` : `Output may remain at ${item.output.path}`;
      failures.push(`${message}. ${recovery}`);
      return ok(undefined);
    })), okAsync(undefined))
    .andThen(() => clean(staged.filter((item) => !item.backedUp)))
    .orElse((message) => { failures.push(message); return ok(undefined); })
    .andThen(() => errAsync([failure, ...failures].join("\n")));
}

export function writeTransaction(outputs: readonly PreparedOutput[]): ResultAsync<void, string> {
  const staged: StagedOutput[] = [];
  return outputs.reduce<ResultAsync<void, string>>((result, output) => result.andThen(() => stage(output, staged)), okAsync(undefined))
    .andThen(() => staged.reduce<ResultAsync<void, string>>((result, item) => result.andThen(() => publish(item)), okAsync(undefined)))
    .orElse((failure) => rollback(staged, failure))
    .andThen(() => clean(staged));
}
