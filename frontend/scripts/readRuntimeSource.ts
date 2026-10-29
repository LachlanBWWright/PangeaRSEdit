import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Result, err, ok } from "neverthrow";

type SourceReader = (path: string) => Result<string, string>;

function readSourceFile(path: string): Result<string, string> {
  return Result.fromThrowable(() => readFileSync(path, "utf8"),
    () => `Could not read runtime contract source: ${path}`)();
}

export function readRuntimeSource(path: string, readFile: SourceReader = readSourceFile,
  visited: Set<string> = new Set<string>()): Result<string, string> {
  if (visited.has(path)) return ok("");
  if (visited.size >= 128) return err("Runtime source include limit exceeded");
  visited.add(path);
  const source = readFile(path);
  if (source.isErr()) return source;
  let combined = source.value;
  for (const match of source.value.matchAll(/^\s*#include\s+"([^"\n]+\.inc)"/gm)) {
    const name = match[1];
    if (!name) return err(`Invalid implementation include in ${path}`);
    const localPath = resolve(dirname(path), name);
    const sharedPath = resolve(process.cwd(), "../games/pangea-ports/shared/script", name);
    const includePath = readFile(localPath).isOk() ? localPath : sharedPath;
    const included = readRuntimeSource(includePath, readFile, visited);
    if (included.isErr()) return included;
    combined += `\n${included.value}`;
  }
  return ok(combined);
}
