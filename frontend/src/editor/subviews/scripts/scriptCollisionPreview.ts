import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";
import { GAME_ASSET_CATALOG, gameIdSchema } from "@pangea/desktop-contracts";

export interface CollisionPreviewBounds {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly planar: boolean;
}

export function getCollisionPreviewBounds(definition: ScriptCustomObjectDefinition, gameId: string): CollisionPreviewBounds | null {
  if (definition.visual.kind === "nativeActor" || definition.collision.kind === "none" || !definition.collision.bounds) return null;
  const desktopGame = gameIdSchema.safeParse(gameId);
  gameId = desktopGame.success ? GAME_ASSET_CATALOG[desktopGame.data].port : gameId;
  const planar = gameId === "MightyMike-Android";
  const round = planar || gameId === "CroMagRally-Android" ? Math.ceil
    : ["OttoMatic-Android", "Bugdom-android", "Nanosaur-android"].includes(gameId) ? Math.trunc : (value: number) => value;
  const bounds = definition.collision.bounds;
  return { width: round(bounds.width / 2) * 2, height: round(bounds.height / 2) * 2, depth: planar ? 0 : round(bounds.depth / 2) * 2, planar };
}
