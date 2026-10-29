import * as fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import { installationSchema, type GameId, type HostError, type Installation, type ProjectFile, type ReleaseManifest } from "@pangea/desktop-contracts";
import { atomicWrite, failure, io, parseJson, statOrMissing } from "./files.ts";
import { fetchCatalog } from "./gameCatalog.ts";
import { downloadGame, unpackGame } from "./gameDownload.ts";
import { findInstallation, installationRecord } from "./gameInstallation.ts";
import { launchGame } from "./gameLaunch.ts";
import { EditorAssets } from "./editorAssets.ts";
import { GameRuns } from "./gameRuns.ts";
import type { GameRun } from "@pangea/desktop-contracts";
import { listGameAssetFiles } from "./gameAssetFiles.ts";
import { upstreamCatalog } from "./upstreamCatalog.ts";
import { downloadUpstream, unpackUpstream } from "./upstreamDownload.ts";

const cachedInstallationSchema = z.union([installationSchema, installationSchema.extend({ assetRootVersion: z.literal(1) })]);

export class GameStore {
  private catalog: ReleaseManifest[] = [];
  private downloads = new Map<GameId, AbortController>();
  private installations: Installation[] = [];
  private running = new Map<GameId, number>();
  public readonly assets: EditorAssets;
  public readonly runs: GameRuns;
  constructor(private readonly root: string,
    private readonly progress: (game: GameId, received: number, total: number) => void,
    notifyRun: (runs: GameRun[]) => void = () => undefined) { this.assets = new EditorAssets(root, () => this.installations); this.runs = new GameRuns(notifyRun); }

  public async load(): Promise<Result<Installation[], HostError>> {
    const info = await statOrMissing(path.join(this.root, "installed.json"));
    if (info.isErr()) return err(info.error);
    if (!info.value) { this.installations = []; return ok([]); }
    const bytes = await io(() => fs.readFile(path.join(this.root, "installed.json"), "utf8"), "Cannot read installed games");
    if (bytes.isErr()) return err(bytes.error);
    const json = parseJson(bytes.value);
    if (json.isErr()) return err(json.error);
    const parsed = z.array(cachedInstallationSchema).safeParse(json.value);
    if (!parsed.success) return err(failure("Invalid installed game registry", "invalid"));
    this.installations = parsed.data.flatMap((entry) => entry.assetRootVersion === 2 ? [entry] : []);
    return ok(this.installations);
  }

  public async releases(prerelease: boolean) {
    const catalog = await fetchCatalog(prerelease);
    if (catalog.isOk()) this.catalog = catalog.value;
    return catalog;
  }

  public assetFiles(game: GameId) {
    const data = this.assets.dataRoot(game);
    return data ? listGameAssetFiles(data) : err(failure("Install a native game or fetch stock data to choose replacement targets", "not-installed"));
  }

  public async readAsset(game: GameId, relative: string): Promise<Result<ProjectFile, HostError>> {
    const location = await this.assets.nativeFile(game, relative);
    if (location.isErr()) return err(location.error);
    const info = await io(() => fs.stat(location.value), "Cannot inspect native asset");
    if (info.isErr()) return err(info.error);
    if (!info.value.isFile() || info.value.size > 16 * 1024 * 1024) return err(failure("Native asset exceeds the 16 MiB limit", "limit"));
    const bytes = await io(() => fs.readFile(location.value), "Cannot read native asset");
    return bytes.isErr() ? err(bytes.error) : ok({ path: relative, bytes: Uint8Array.from(bytes.value) });
  }

  public async install(game: GameId, tag: string): Promise<Result<unknown, HostError>> {
    if (this.downloads.size > 0) return err(failure("Wait for the current download to finish", "busy"));
    if (this.running.get(game)) return err(failure("Close this game before updating it", "busy"));
    const release = this.catalog.find((item) => item.tag === tag);
    const asset = release?.assets.find((item) => item.game === game && item.kind === "runtime"
      && item.platform === process.platform && (item.arch === process.arch || item.arch === "universal"));
    if (!asset) return err(failure("No compatible package in this release", "unavailable"));
    const controller = new AbortController();
    this.downloads.set(game, controller);
    const directory = path.join(this.root, game, randomUUID());
    const created = await io(() => fs.mkdir(directory, { recursive: true }), "Cannot create game installation directory");
    if (created.isErr()) { this.downloads.delete(game); return err(created.error); }
    const archive = path.join(directory, asset.filename);
    const downloaded = await downloadGame(asset, tag, archive, controller.signal,
      (received) => this.progress(game, received, asset.size));
    let result: Result<unknown, HostError>;
    if (downloaded.isErr()) result = err(downloaded.error);
    else {
      const unpacked = await unpackGame(asset, archive, directory);
      if (unpacked.isErr()) result = err(unpacked.error);
      else {
        const found = await findInstallation(unpacked.value, game);
        result = found.isErr() ? err(found.error)
          : await this.register(installationRecord(game, tag, found.value, true));
      }
    }
    this.downloads.delete(game);
    await io(() => fs.rm(archive, { force: true }), "Cannot remove download archive");
    if (result.isErr()) await io(() => fs.rm(directory, { recursive: true, force: true }), "Cannot clean incomplete installation");
    return result;
  }

  public cancel(game: GameId): Result<void, HostError> {
    this.downloads.get(game)?.abort();
    return ok(undefined);
  }

  public async installUpstreamData(game: GameId): Promise<Result<unknown, HostError>> {
    if (this.downloads.size > 0) return err(failure("Wait for the current download to finish", "busy"));
    const release = upstreamCatalog().find((item) => item.game === game);
    if (!release) return err(failure("No upstream stock data is available for this game", "unavailable"));
    const controller = new AbortController();
    this.downloads.set(game, controller);
    const directory = path.join(this.root, "editor-assets", game, randomUUID());
    const archive = path.join(directory, release.filename);
    const made = await io(() => fs.mkdir(directory, { recursive: true }), "Cannot create stock data installation");
    let result: Result<unknown, HostError> = made;
    if (made.isOk()) {
      const downloaded = await downloadUpstream(release, archive, controller.signal,
        (received) => this.progress(game, received, release.size));
      if (downloaded.isErr()) result = err(downloaded.error);
      else {
        const unpacked = await unpackUpstream(release, archive, directory, controller.signal);
        if (unpacked.isErr()) result = err(unpacked.error);
        else if (controller.signal.aborted) result = err(failure("Data download cancelled", "cancelled"));
        else result = await this.assets.register(game, release.version, directory,
          { source: "upstream", dataRoot: unpacked.value, releaseUrl: release.releaseUrl });
      }
    }
    await io(() => fs.rm(archive, { force: true }), "Cannot remove upstream archive");
    if (result.isErr()) await io(() => fs.rm(directory, { recursive: true, force: true }), "Cannot clean incomplete stock data");
    this.downloads.delete(game);
    return result;
  }

  public removeAssets(game: GameId) {
    return this.downloads.has(game) ? err(failure("Cancel the active download first", "busy")) : this.assets.remove(game);
  }

  public async locate(game: GameId, folder: string) {
    const found = await findInstallation(folder, game);
    return found.isErr() ? err(found.error) : this.register(installationRecord(game, "external", found.value, false));
  }

  private async register(installation: Installation): Promise<Result<Installation[], HostError>> {
    const previous = this.installations.find((item) => item.game === installation.game);
    const next = [...this.installations.filter((item) => item.game !== installation.game), installation];
    const saved = await atomicWrite(path.join(this.root, "installed.json"), new TextEncoder().encode(JSON.stringify(next, null, 2)));
    if (saved.isErr()) return err(saved.error);
    this.installations = next;
    if (previous?.managed && previous.executable !== installation.executable) {
      const versionFolder = path.relative(path.join(this.root, previous.game), previous.executable).split(path.sep)[0];
      if (versionFolder && /^[a-f0-9-]{36}$/.test(versionFolder))
        await io(() => fs.rm(path.join(this.root, previous.game, versionFolder), { recursive: true, force: true }), "Cannot clean previous game version");
    }
    return ok(next);
  }

  public async remove(game: GameId): Promise<Result<Installation[], HostError>> {
    if (this.running.get(game)) return err(failure("Close this game before removing it", "busy"));
    if (this.downloads.has(game)) return err(failure("Cancel the active download first", "busy"));
    const installation = this.installations.find((item) => item.game === game);
    if (installation?.managed) {
      const removed = await io(() => fs.rm(path.join(this.root, game), { recursive: true, force: true }), "Cannot remove installed game");
      if (removed.isErr()) return err(removed.error);
    }
    const next = this.installations.filter((item) => item.game !== game);
    const saved = await atomicWrite(path.join(this.root, "installed.json"), new TextEncoder().encode(JSON.stringify(next)));
    if (saved.isErr()) return err(saved.error);
    this.installations = next;
    return ok(next);
  }

  public async launch(game: GameId, files?: ProjectFile[], args: string[] = [], sourceProject: string | null = null): Promise<Result<void, HostError>> {
    const installation = this.installations.find((item) => item.game === game);
    if (!installation) return err(failure("Install or locate this game in Games first", "not-installed"));
    if ([...this.running.values()].reduce((sum, count) => sum + count, 0) >= 8) return err(failure("Close a running game before launching another", "limit"));
    const runRoot = path.join(this.root, "runs", randomUUID());
    const run = this.runs.begin(game, () => this.launch(game, files, args, sourceProject), sourceProject);
    this.running.set(game, (this.running.get(game) ?? 0) + 1);
    const released = () => this.running.set(game, Math.max(0, (this.running.get(game) ?? 0) - 1));
    const result = await launchGame(installation, runRoot, files, args, released, run.observer);
    if (result.isErr()) { this.runs.failed(run.id, result.error.message); released(); await io(() => fs.rm(runRoot, { recursive: true, force: true }), "Cannot clean failed test"); }
    return result;
  }
}
