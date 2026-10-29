import * as fs from "node:fs/promises";
import path from "node:path";
import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import { GAME_ASSET_CATALOG, assetInstallationSchema, type GameId, type HostError, type Installation } from "@pangea/desktop-contracts";
import { atomicWrite, failure, io, parseJson, projectPath, statOrMissing } from "./files.ts";
import { buildHomePreview, resolveNativeFile } from "./nativeHomePreview.ts";
import { DerivedAssetCache } from "./derivedAssetCache.ts";
import { NativeAssetIndex } from "./nativeAssetIndex.ts";
import { gameAssetRoute, type GameAssetRoute } from "./gameAssetRoutes.ts";

type AssetInstallation = z.infer<typeof assetInstallationSchema>;
export interface ResolvedAsset { path: string; source: "native" | "derived" | "editor"; game: GameId }

export class EditorAssets {
  private installed: AssetInstallation[] = [];
  private readonly previews: DerivedAssetCache;
  private readonly index = new NativeAssetIndex();
  constructor(private readonly directory: string, private readonly localGames: () => readonly Installation[] = () => []) {
    this.previews = new DerivedAssetCache(path.join(directory, "derived-assets-v2"));
  }
  public async load(): Promise<Result<AssetInstallation[], HostError>> {
    const registry = path.join(this.directory, "assets.json");
    const info = await statOrMissing(registry);
    if (info.isErr()) return err(info.error);
    if (!info.value) { this.installed = []; return ok([]); }
    const text = await io(() => fs.readFile(registry, "utf8"), "Cannot read editor asset registry");
    if (text.isErr()) return err(text.error);
    const json = parseJson(text.value);
    if (json.isErr()) return err(json.error);
    const parsed = z.array(assetInstallationSchema).safeParse(json.value);
    if (!parsed.success) return err(failure("Invalid game asset registry. The existing source selection was retained.", "invalid"));
    this.installed = parsed.data;
    return ok(parsed.data);
  }
  public async register(game: GameId, version: string, root: string,
    upstream?: { source: "upstream"; dataRoot: string; releaseUrl: string }) {
    const previous = this.installed.find((item) => item.game === game);
    const record: AssetInstallation = { game, version, root, source: "editor", ...upstream };
    const next = [...this.installed.filter((item) => item.game !== game), record];
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
  public dataRoot(game: GameId): string | null {
    return this.installed.find((item) => item.game === game && item.source === "upstream")?.dataRoot
      ?? this.localGames().find((item) => item.game === game)?.data ?? null;
  }
  public refresh() { this.index.clear(); }
  public async nativeFile(game: GameId, relative: string): Promise<Result<string, HostError>> {
    const root = this.dataRoot(game);
    if (!root) return err(failure(`No native data is installed for ${game}`, "not-installed"));
    if (!relative.startsWith("Data/") || /^Data\/Scripts\//i.test(relative)) return err(failure("Choose a native game asset", "invalid"));
    const resolved = await resolveNativeFile(this.index, root, game, relative.slice(5));
    if (resolved.isErr()) return err(resolved.error);
    return resolved.value ? ok(resolved.value) : err(failure(`Missing ${game} asset: ${relative}`, "missing"));
  }
  public async remove(game: GameId) {
    const next = this.installed.filter((item) => item.game !== game);
    const saved = await atomicWrite(path.join(this.directory, "assets.json"), new TextEncoder().encode(JSON.stringify(next)));
    if (saved.isErr()) return err(saved.error);
    this.installed = next;
    const removed = await io(() => fs.rm(path.join(this.directory, "editor-assets", game), { recursive: true, force: true }), "Cannot remove editor assets");
    return removed.isErr() ? err(removed.error) : ok(next);
  }
  public async resolveAsset(relative: string): Promise<Result<ResolvedAsset | null, HostError>> {
    const route = gameAssetRoute(relative);
    if (route) {
      const root = this.dataRoot(route.game);
      if (root) {
        const resolved = route.kind === "home"
          ? await buildHomePreview(this.index, this.previews, root, route.game)
          : await this.nativeFile(route.game, `Data/${route.path}`);
        return resolved.map((resolvedPath) => ({ path: resolvedPath, game: route.game,
          source: route.kind === "home" ? "derived" : "native" }));
      }
    }
    if (!route && !/^(assets|games|glbModels|Data)\//.test(relative)) return ok(null);
    const editorPath = route ? this.legacyPath(route) : relative;
    for (const item of this.installed.filter((entry) => entry.source === "editor" && (!route || entry.game === route.game))) {
      const candidate = await projectPath(item.root, editorPath);
      if (candidate.isErr()) return err(candidate.error);
      const info = await statOrMissing(candidate.value);
      if (info.isErr()) return err(info.error);
      if (info.value?.isFile()) return ok({ path: candidate.value, game: item.game, source: "editor" });
    }
    return route ? err(failure(`Missing ${route.game} data for ${relative}`, "not-installed")) : ok(null);
  }

  public async resolve(relative: string): Promise<string | null> {
    const resolved = await this.resolveAsset(relative);
    return resolved.isOk() ? resolved.value?.path ?? null : null;
  }

  private legacyPath(route: GameAssetRoute): string {
    const definition = GAME_ASSET_CATALOG[route.game];
    if (route.kind === "home") return `glbModels/${definition.home?.filename ?? "missing.glb"}`;
    const [folder, ...parts] = route.path.split("/");
    if (folder?.toLowerCase() === "terrain") return `assets/${definition.assets}/terrain/${parts.join("/")}`;
    return `games/${definition.game}/${folder?.toLowerCase()}/${parts.join("/")}`;
  }
}
