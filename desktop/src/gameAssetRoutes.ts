import { GAME_ASSET_CATALOG, gameIdSchema, relativePathSchema, type GameId } from "@pangea/desktop-contracts";
import { upstreamAssetPath } from "./upstreamAssetPaths.ts";

export interface GameAssetRoute { game: GameId; path: string; kind: "native" | "home" }

export function gameAssetRoute(relative: string): GameAssetRoute | null {
  if (!relativePathSchema.safeParse(relative).success) return null;
  if (relative.startsWith("game-assets/")) {
    const [, gameName, ...parts] = relative.split("/");
    const game = gameIdSchema.safeParse(gameName);
    const native = parts.join("/");
    if (!game.success) return null;
    if (native === "preview/home.glb") return { game: game.data, path: native, kind: "home" };
    if (!native.startsWith("Data/") || /^Data\/Scripts\//i.test(native)) return null;
    return { game: game.data, path: native.slice(5), kind: "native" };
  }
  for (const game of gameIdSchema.options) {
    const names = GAME_ASSET_CATALOG[game];
    if (names.home && relative === `glbModels/${names.home.filename}`) return { game, path: "preview/home.glb", kind: "home" };
    const native = upstreamAssetPath(game, relative);
    if (native) return { game, path: native, kind: "native" };
  }
  return null;
}
