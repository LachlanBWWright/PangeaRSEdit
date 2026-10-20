import * as fs from "node:fs/promises";
import path from "node:path";
import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import { assetInstallationSchema, type GameId, type HostError } from "@pangea/desktop-contracts";
import { atomicWrite, io, parseJson, projectPath, statOrMissing } from "./files.ts";

type AssetInstallation = z.infer<typeof assetInstallationSchema>;

export class EditorAssets {
  private installed: AssetInstallation[] = [];
  constructor(private readonly directory: string) {}
  public async load(): Promise<Result<AssetInstallation[], HostError>> {
    const registry = path.join(this.directory, "assets.json");
    const info = await statOrMissing(registry);
    if (info.isErr()) return err(info.error);
    if (!info.value) return ok([]);
    const text = await io(() => fs.readFile(registry, "utf8"), "Cannot read editor asset registry");
    if (text.isErr()) return err(text.error);
    const json = parseJson(text.value);
    if (json.isErr()) return err(json.error);
    const parsed = z.array(assetInstallationSchema).safeParse(json.value);
    if (!parsed.success) return ok([]);
    this.installed = parsed.data;
    return ok(parsed.data);
  }
  public async register(game: GameId, version: string, root: string) {
    const previous = this.installed.find((item) => item.game === game);
    const next = [...this.installed.filter((item) => item.game !== game), { game, version, root }];
    const saved = await atomicWrite(path.join(this.directory, "assets.json"), new TextEncoder().encode(JSON.stringify(next)));
    if (saved.isErr()) return err(saved.error);
    this.installed = next;
    if (previous && previous.root !== root) {
      const oldFolder = path.relative(path.join(this.directory, "editor-assets", game), previous.root);
      if (/^[a-f0-9-]{36}$/.test(oldFolder))
        await io(() => fs.rm(previous.root, { recursive: true, force: true }), "Cannot remove previous editor assets");
    }
    return ok(next);
  }
  public async remove(game: GameId) {
    const next = this.installed.filter((item) => item.game !== game);
    const saved = await atomicWrite(path.join(this.directory, "assets.json"), new TextEncoder().encode(JSON.stringify(next)));
    if (saved.isErr()) return err(saved.error);
    this.installed = next;
    const removed = await io(() => fs.rm(path.join(this.directory, "editor-assets", game), { recursive: true, force: true }), "Cannot remove editor assets");
    return removed.isErr() ? err(removed.error) : ok(next);
  }
  public async resolve(relative: string): Promise<string | null> {
    for (const item of this.installed) {
      const candidate = await projectPath(item.root, relative);
      if (candidate.isErr()) continue;
      const info = await statOrMissing(candidate.value);
      if (info.isOk() && info.value?.isFile()) return candidate.value;
    }
    return null;
  }
}
