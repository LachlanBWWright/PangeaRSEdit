import { atom } from "jotai";
import type { AtomicLevelData } from "@/data/utils/levelDataUtils";
import { BlockHistoryUpdate } from "@/data/globals/history";

export interface EditorDataHistory { readonly items: AtomicLevelData[]; readonly index: number; }
function sameSnapshot(left: AtomicLevelData | undefined, right: AtomicLevelData): boolean {
  return left?.headerData === right.headerData && left.itemData === right.itemData && left.liquidData === right.liquidData && left.fenceData === right.fenceData && left.splineData === right.splineData && left.terrainData === right.terrainData && left.scriptWorkspaceStore === right.scriptWorkspaceStore;
}
export const editorDataHistoryAtom = atom<EditorDataHistory>({ items: [], index: 0 });
export const recordEditorDataHistoryAtom = atom(null, (get, set, data: AtomicLevelData) => {
  if (!data.headerData) { set(editorDataHistoryAtom, { items: [], index: 0 }); set(BlockHistoryUpdate, false); return; }
  if (get(BlockHistoryUpdate)) { set(BlockHistoryUpdate, false); return; }
  const current = get(editorDataHistoryAtom);
  if (sameSnapshot(current.items[current.index], data)) return;
  const items = [...current.items.slice(0, current.index + 1), data].slice(-50);
  set(editorDataHistoryAtom, { items, index: items.length - 1 });
});
