import { err, ok, ResultAsync, Result } from "neverthrow";
import type { ScriptLibrary } from "./scriptLibrary";
import { isDefinitionSourcePath } from "./scriptDefinitionDependencies";
import { z } from "zod";

function luaSourcePath(relativePath: string, hasProjectRoot: boolean): string | null {
  const prefix = "Data/Scripts/src/";
  const index = relativePath.indexOf(prefix);
  const path = index >= 0 ? relativePath.slice(index)
    : hasProjectRoot ? "" : `${prefix}${relativePath.split("/").slice(1).join("/")}`;
  return isDefinitionSourcePath(path) ? path : null;
}

export async function readIdeLuaFolder(files: readonly File[], gameId: string): Promise<Result<ScriptLibrary, string>> {
  const metadata = files.find((file) => /(?:^|\/)library\.json$/.test(file.webkitRelativePath)
    || file.webkitRelativePath.endsWith("Data/Scripts/config/project.json"));
  if (metadata) {
    const read = await ResultAsync.fromPromise(metadata.text(), () => "Could not read the project's game identity.");
    if (read.isErr()) return err(read.error);
    const json = Result.fromThrowable((): unknown => JSON.parse(read.value), () => "Invalid project JSON.")();
    if (json.isErr()) return err(json.error);
    const parsed = z.object({ gameId: z.string() }).safeParse(json.value);
    if (!parsed.success) return err("The project has invalid game metadata.");
    if (parsed.data.gameId !== gameId) return err(`This project targets ${parsed.data.gameId}. Select its game before updating Lua.`);
  }
  const hasProjectRoot = files.some((file) => file.webkitRelativePath.includes("Data/Scripts/"));
  const sources: Record<string, string> = {};
  let size = 0;
  for (const file of files) {
    const path = luaSourcePath(file.webkitRelativePath, hasProjectRoot);
    if (!path) continue;
    size += file.size;
    if (file.size > 1024 * 1024 || size > 16 * 1024 * 1024) return err("Lua folder exceeds the 1 MiB per-source or 16 MiB total budget.");
    if (sources[path] !== undefined) return err(`Folder maps more than one file to ${path}. Choose one project root.`);
    const content = await ResultAsync.fromPromise(file.text(), () => `Could not read ${file.name}`);
    if (content.isErr()) return err(content.error);
    sources[path] = content.value;
  }
  if (!Object.keys(sources).length) return err("No editable Lua sources found. Choose the exported project folder or its src folder. Generated main.lua is excluded.");
  return ok({
    manifest: { kind: "pangea-script-library", version: 1, gameId, objects: [], behaviors: [], params: [], sources: Object.keys(sources), assets: [], moduleOrder: Object.keys(sources) },
    sources, assets: {},
  });
}
