import * as fs from "node:fs/promises";
import path from "node:path";
import { err, ok, type Result } from "neverthrow";
import type { GameId, HostError, Installation } from "@pangea/desktop-contracts";
import { failure, io, projectPath, statOrMissing } from "./files.ts";
import { runProcess } from "./processes.ts";

const executables: Record<GameId, string> = {
  OttoMatic: "OttoMatic", Bugdom: "Bugdom", Bugdom2: "Bugdom2", Nanosaur: "Nanosaur",
  Nanosaur2: "Nanosaur2", CroMagRally: "CroMagRally", BillyFrontier: "BillyFrontier", MightyMike: "MightyMike",
};

async function regularPath(root: string, relative: string, directory: boolean): Promise<string | null> {
  const location = await projectPath(root, relative);
  if (location.isErr()) return null;
  const info = await statOrMissing(location.value);
  if (info.isErr() || !info.value || !(directory ? info.value.isDirectory() : info.value.isFile())) return null;
  return location.value;
}

async function appDirInstallation(root: string, game: GameId) {
  const binary = await regularPath(root, `usr/bin/${executables[game]}`, false);
  if (!binary) return null;
  const executable = await regularPath(root, "AppRun", false);
  const system = await regularPath(root, "Data/System", true);
  if (!executable || !system) return null;
  const support = await runProcess(executable, ["--editor-data-root-version"], root);
  return support.isOk() && support.value.trim() === "2" ? { executable, data: path.join(root, "Data") } : null;
}

export async function findInstallation(root: string, game: GameId, depth = 0): Promise<Result<{ executable: string; data: string }, HostError>> {
  if (depth > 6) return err(failure("No compatible game executable found", "incompatible"));
  const listing = await io(() => fs.readdir(root, { withFileTypes: true }), "Cannot inspect game installation");
  if (listing.isErr()) return err(listing.error);
  const appDir = await appDirInstallation(root, game);
  if (appDir) return ok(appDir);
  for (const entry of listing.value) {
    const expected = executables[game];
    if (!entry.isFile() || (entry.name !== expected && entry.name !== `${expected}.exe`)) continue;
    const executable = path.join(root, entry.name);
    const candidates = [{ root, relative: "Data" }, { root: path.dirname(root), relative: "Resources" },
      { root: path.dirname(root), relative: "Resources/Data" }];
    for (const candidate of candidates) {
      const system = await regularPath(candidate.root, `${candidate.relative}/System`, true);
      if (!system) continue;
      const support = await runProcess(executable, ["--editor-data-root-version"], root);
      if (support.isOk() && support.value.trim() === "2") return ok({ executable, data: path.join(candidate.root, candidate.relative) });
    }
  }
  for (const entry of listing.value.filter((item) => item.isDirectory() && !item.isSymbolicLink())) {
    const found = await findInstallation(path.join(root, entry.name), game, depth + 1);
    if (found.isOk()) return found;
  }
  return err(failure("Choose a game build supporting editor asset-root version 2", "incompatible"));
}

export function installationRecord(game: GameId, version: string, found: { executable: string; data: string }, managed: boolean): Installation {
  return { game, version, ...found, managed, assetRootVersion: 2 };
}
