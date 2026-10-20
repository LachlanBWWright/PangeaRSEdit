import { atom, useAtomValue, useSetAtom } from "jotai";
import type { GameId } from "@pangea/desktop-contracts";
import type { Game } from "@/data/globals/globals";
import { desktopBridge } from "./client";
import { desktopGameId } from "./games";

export const installedEditorAssetsAtom = atom<readonly GameId[]>([]);
export const desktopGamesOpenAtom = atom(false);

export function useGameAssetAvailability(game: Game) {
  const installed = useAtomValue(installedEditorAssetsAtom);
  const open = useSetAtom(desktopGamesOpenAtom);
  return { available: !desktopBridge() || installed.includes(desktopGameId(game)), openDownloads: () => open(true) };
}
