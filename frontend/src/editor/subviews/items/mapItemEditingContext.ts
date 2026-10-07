import { createContext, useContext } from "react";
import { atom } from "jotai";
import type { Game } from "@/data/globals/globals";
import type { MapItemPoint } from "./mapItemCoordinates";
import type { MapItemTarget } from "./mapItemSelection";
import type { MapItemSnapshot } from "./mapItemEdits";
import type { MapItemArrangement } from "./mapItemArrangement";
import type { ScriptWorkspaceState } from "../scripts/scriptWorkspaceState";

export type MapItemCommand = "delete" | "duplicate" | "copy" | "paste" | "selectAll" | "clear" | MapItemArrangement;
export interface MapItemEditingController {
  readonly startDrag: (target: MapItemTarget) => void;
  readonly previewDrag: (target: MapItemTarget, point: MapItemPoint) => void;
  readonly finishDrag: (target: MapItemTarget, point: MapItemPoint) => void;
  readonly cancelDrag: () => void;
}
export const MapItemEditingContext = createContext<MapItemEditingController | null>(null);
export function useMapItemEditing(): MapItemEditingController | null { return useContext(MapItemEditingContext); }

export const mapItemClipboardAtom = atom<{ readonly game: Game; readonly snapshot: MapItemSnapshot; readonly workspace: ScriptWorkspaceState } | null>(null);
export const mapItemCommandHandlerAtom = atom<((command: MapItemCommand) => void) | null>(null);
export const requestMapItemCommandAtom = atom(null, (get, _set, command: MapItemCommand) => {
  get(mapItemCommandHandlerAtom)?.(command);
});
