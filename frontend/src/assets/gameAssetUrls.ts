import { GAME_ASSET_CATALOG } from "@pangea/desktop-contracts";
import type { Game } from "@/data/globals/globals";
import { desktopBridge } from "@/platform/desktop/client";
import { desktopGameId } from "@/platform/desktop/games";
import { versionedAssetUrl } from "./assetState";

export function gameAssetUrl(game: Game, nativePath: string, browserUrl: string): string {
  if (!desktopBridge()) return versionedAssetUrl(browserUrl);
  const url = `${import.meta.env.BASE_URL}game-assets/${desktopGameId(game)}/Data/${nativePath}`;
  return versionedAssetUrl(url);
}

export function gameAssetBase(game: Game): string {
  const id = desktopGameId(game);
  return desktopBridge() ? `${import.meta.env.BASE_URL}game-assets/${id}/Data`
    : `${import.meta.env.BASE_URL}games/${GAME_ASSET_CATALOG[id].game}`;
}

export function homeAssetUrl(game: Game, browserUrl: string): string {
  return desktopBridge() ? versionedAssetUrl(`/game-assets/${desktopGameId(game)}/preview/home.glb`) : browserUrl;
}
