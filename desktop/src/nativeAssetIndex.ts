import * as fs from "node:fs/promises";
import path from "node:path";
import { err, ok, type Result } from "neverthrow";
import { relativePathSchema, type HostError } from "@pangea/desktop-contracts";
import { failure, io, statOrMissing } from "./files.ts";

interface Directory { stamp: string; names: readonly string[] }
export class NativeAssetIndex {
  private readonly directories = new Map<string, Directory>();
  public clear() { this.directories.clear(); }

  public async resolve(root: string, relative: string): Promise<Result<string | null, HostError>> {
    if (!relativePathSchema.safeParse(relative).success) return err(failure(`Invalid asset path: ${relative}`, "invalid"));
    const rootInfo = await statOrMissing(root);
    if (rootInfo.isErr()) return err(rootInfo.error);
    if (!rootInfo.value) return err(failure("The selected game data folder no longer exists", "missing"));
    if (!rootInfo.value.isDirectory() || rootInfo.value.isSymbolicLink()) return err(failure("Game data must be a real directory", "invalid"));
    let current = root;
    const segments = relative.split("/");
    for (const [index, segment] of segments.entries()) {
      const names = await this.names(current);
      if (names.isErr()) return err(names.error);
      const matches = names.value.filter((name) => name.toLowerCase() === segment.toLowerCase());
      if (matches.length > 1) return err(failure(`Ambiguous asset filename: ${relative}`, "ambiguous"));
      const match = matches[0];
      if (!match) return ok(null);
      current = path.join(current, match);
      const info = await statOrMissing(current);
      if (info.isErr()) return err(info.error);
      if (!info.value) return ok(null);
      if (info.value.isSymbolicLink()) return err(failure(`Asset symlinks are not followed: ${relative}`, "invalid"));
      const last = index === segments.length - 1;
      if (last && !info.value.isFile() || !last && !info.value.isDirectory()) return ok(null);
    }
    return ok(current);
  }

  private async names(directory: string): Promise<Result<readonly string[], HostError>> {
    const info = await io(() => fs.stat(directory), "Cannot inspect game asset directory");
    if (info.isErr()) return err(info.error);
    const stamp = `${info.value.mtimeMs}:${info.value.ctimeMs}:${info.value.ino}`;
    const cached = this.directories.get(directory);
    if (cached?.stamp === stamp) return ok(cached.names);
    const listed = await io(() => fs.readdir(directory), "Cannot list game asset directory");
    if (listed.isErr()) return err(listed.error);
    if (this.directories.size >= 512) this.directories.clear();
    this.directories.set(directory, { stamp, names: listed.value });
    return ok(listed.value);
  }
}
