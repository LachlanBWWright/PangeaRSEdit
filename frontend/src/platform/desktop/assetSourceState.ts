import { z } from "zod";
import { err, ok } from "neverthrow";
import { assetInstallationSchema, installationSchema } from "@pangea/desktop-contracts";
import { desktopRequest } from "./client";
import { updateAssetSources } from "@/assets/assetState";

export async function loadAssetSources() {
  const [assets, games] = await Promise.all([
    desktopRequest({ operation: "games.assets" }, z.array(assetInstallationSchema)),
    desktopRequest({ operation: "games.installed" }, z.array(installationSchema)),
  ]);
  if (assets.isErr()) return err(assets.error);
  if (games.isErr()) return err(games.error);
  return ok({ assets: assets.value, games: games.value });
}

export function syncAssetSources(assets: readonly z.infer<typeof assetInstallationSchema>[], games: readonly z.infer<typeof installationSchema>[]) {
  const identity = [...assets.map((entry) => [entry.game, entry.source, entry.root, entry.dataRoot, entry.version]),
    ...games.map((entry) => [entry.game, "local", entry.data, entry.version])];
  updateAssetSources(JSON.stringify(identity.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))));
}
