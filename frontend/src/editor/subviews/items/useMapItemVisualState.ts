import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { selectAtom } from "jotai/utils";
import { mapItemKey, mapItemDragPreviewKeysAtom, mapItemSelectionKeysAtom, type MapItemTarget } from "./mapItemSelection";

export function useMapItemVisualState(target: MapItemTarget) {
  const selectedAtom = useMemo(() => selectAtom(mapItemSelectionKeysAtom,
    (selection) => selection.has(mapItemKey(target))), [target]);
  const offsetAtom = useMemo(() => selectAtom(mapItemDragPreviewKeysAtom,
    (preview) => preview?.keys.has(mapItemKey(target)) ? {x: preview.x, z: preview.z} : {x: 0, z: 0},
    (a, b) => a.x === b.x && a.z === b.z), [target]);
  return { selected: useAtomValue(selectedAtom), offset: useAtomValue(offsetAtom) };
}
