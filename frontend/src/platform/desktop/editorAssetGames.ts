import { assetInstallationSchema, type GameId, type Installation } from "@pangea/desktop-contracts";
import { z } from "zod";

export function editorAssetGames(installations: readonly z.infer<typeof assetInstallationSchema>[]): GameId[] {
  return installations.filter((entry) => entry.source === "editor").map((entry) => entry.game);
}

export function nativeDataGames(installations: readonly z.infer<typeof assetInstallationSchema>[], games: readonly Installation[] = []): GameId[] {
  return [...new Set([...games.map((entry) => entry.game),
    ...installations.filter((entry) => entry.source === "upstream" && entry.dataRoot !== undefined).map((entry) => entry.game)])];
}
