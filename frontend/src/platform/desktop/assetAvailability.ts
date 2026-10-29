import { atom, useAtomValue, useSetAtom } from "jotai";
import { GAME_ASSET_CATALOG, type GameId } from "@pangea/desktop-contracts";
import type { Game } from "@/data/globals/globals";
import { desktopBridge } from "./client";
import { DESKTOP_GAMES, desktopGameId } from "./games";
import { useAssetState } from "@/assets/useAssetState";

export const installedEditorAssetsAtom = atom<readonly GameId[]>([]);
export const installedNativeGameDataAtom = atom<readonly GameId[]>([]);
export const desktopGamesOpenAtom = atom(false);

export function useAvailableGameAssets() {
  useAssetState();
  const installed = useAtomValue(installedEditorAssetsAtom);
  const nativeData = useAtomValue(installedNativeGameDataAtom);
  const desktop = !!desktopBridge();
  const isAvailable = (id: GameId) => !desktop || installed.includes(id) || nativeData.includes(id);
  const isCatalogAvailable = (id: string) => !desktop || DESKTOP_GAMES.some((game) => GAME_ASSET_CATALOG[game.id].game === id && isAvailable(game.id));
  return { isAvailable, isCatalogAvailable };
}

export function useGameAssetAvailability(game: Game) {
  const { isAvailable } = useAvailableGameAssets();
  const open = useSetAtom(desktopGamesOpenAtom);
  const available = isAvailable(desktopGameId(game));
  return { available, levelsAvailable: available, openDownloads: () => open(true) };
}
