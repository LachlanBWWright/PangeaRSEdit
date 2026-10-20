import * as fs from "node:fs/promises";
import path from "node:path";
import { err, ok, type Result } from "neverthrow";
import type { GameId, HostError, Installation } from "@pangea/desktop-contracts";
import { failure, io, statOrMissing } from "./files.ts";
import { runProcess } from "./processes.ts";

const executables: Record<GameId, string> = {
  OttoMatic: "OttoMatic", Bugdom: "Bugdom", Bugdom2: "Bugdom2", Nanosaur: "Nanosaur",
  Nanosaur2: "Nanosaur2", CroMagRally: "CroMagRally", BillyFrontier: "BillyFrontier", MightyMike: "MightyMike",
};

export async function findInstallation(root: string, game: GameId, depth = 0): Promise<Result<{ executable: string; data: string }, HostError>> {
  if (depth > 6) return err(failure("No compatible game executable found", "incompatible"));
  const listing = await io(() => fs.readdir(root, { withFileTypes: true }), "Cannot inspect game installation");
  if (listing.isErr()) return err(listing.error);
  for (const entry of listing.value) {
    const expected = executables[game];
    if (!entry.isFile() || (entry.name !== expected && entry.name !== `${expected}.exe`)) continue;
    const executable = path.join(root, entry.name);
    const candidates = [path.join(root, "Data"), path.resolve(root, "../Resources"), path.resolve(root, "../Resources/Data")];
    for (const candidate of candidates) {
      const system = await statOrMissing(path.join(candidate, "System"));
      if (!system.isOk() || !system.value?.isDirectory()) continue;
      const support = await runProcess(executable, ["--editor-data-root-version"], root);
      if (support.isOk() && support.value.trim() === "1") return ok({ executable, data: candidate });
    }
  }
  for (const entry of listing.value.filter((item) => item.isDirectory() && !item.isSymbolicLink())) {
    const found = await findInstallation(path.join(root, entry.name), game, depth + 1);
    if (found.isOk()) return found;
  }
  return err(failure("Choose a game build supporting editor asset-root version 1", "incompatible"));
}

export function installationRecord(game: GameId, version: string, found: { executable: string; data: string }, managed: boolean): Installation {
  return { game, version, ...found, managed, assetRootVersion: 1 };
}
