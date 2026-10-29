import * as fs from "node:fs/promises";
import path from "node:path";
import { err, ok, type Result } from "neverthrow";
import { relativePathSchema, type HostError } from "@pangea/desktop-contracts";
import { failure, io } from "./files.ts";

export async function listGameAssetFiles(root: string, directory = "Data", budget = { remaining: 20000 }): Promise<Result<{ path: string; size: number }[], HostError>> {
  const absolute = directory === "Data" ? root : path.join(root, directory.slice(5));
  const listed = await io(() => fs.readdir(absolute, { withFileTypes: true }), "Cannot list native game assets");
  if (listed.isErr()) return err(listed.error);
  const files: { path: string; size: number }[] = [];
  for (const entry of listed.value) {
    if (--budget.remaining < 0) return err(failure("Game installation exceeds the asset listing limit", "limit"));
    const relative = `${directory}/${entry.name}`;
    if (!relativePathSchema.safeParse(relative).success || relative.startsWith("Data/Scripts/") || entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      const nested = await listGameAssetFiles(root, relative, budget);
      if (nested.isErr()) return err(nested.error);
      files.push(...nested.value);
    } else if (entry.isFile() && /(?:\.(?:bg3d|bg3|3dmf|3df|shapes|tga|tileset|png|jpe?g|wav|aiff|aif)|\.skeleton(?:\.rsrc)?)$/i.test(relative)) {
      const info = await io(() => fs.stat(path.join(root, relative.slice(5))), "Cannot inspect native game asset");
      if (info.isErr()) return err(info.error);
      files.push({ path: relative, size: info.value.size });
    }
  }
  return ok(files.sort((a, b) => a.path.localeCompare(b.path)));
}
