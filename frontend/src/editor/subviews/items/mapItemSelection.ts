import { atom } from "jotai";
import { SelectedItem } from "@/data/items/itemAtoms";
import { SelectedCustomPlacementAtom } from "../scripts/scriptPlacementSelectionState";

export type MapItemTarget =
  | { readonly kind: "native"; readonly index: number }
  | { readonly kind: "custom"; readonly id: string };

export function mapItemKey(target: MapItemTarget): string {return target.kind === "native" ? `native-${target.index}` : `custom-${target.id}`;}

export function sameMapItem(a: MapItemTarget, b: MapItemTarget): boolean {
  return a.kind === "native" && b.kind === "native"
    ? a.index === b.index
    : a.kind === "custom" && b.kind === "custom" && a.id === b.id;
}

export function selectMapItems(
  current: readonly MapItemTarget[], target: MapItemTarget,
  additive: boolean, forDrag = false,
): readonly MapItemTarget[] {
  const exists = current.some((item) => sameMapItem(item, target));
  if (forDrag && !additive && exists) return current;
  if (!additive) return [target];
  return exists ? current.filter((item) => !sameMapItem(item, target)) : [...current, target];
}

const selectionStateAtom = atom<readonly MapItemTarget[]>([]);

export const mapItemSelectionAtom = atom((get): readonly MapItemTarget[] => {
  const native = get(SelectedItem);
  const custom = get(SelectedCustomPlacementAtom);
  const primary: MapItemTarget | null = custom !== null
    ? { kind: "custom", id: custom }
    : native !== undefined ? { kind: "native", index: native } : null;
  if (!primary) return [];
  const selected = get(selectionStateAtom);
  return selected.some((item) => sameMapItem(item, primary)) ? selected : [primary];
});
export const mapItemSelectionKeysAtom = atom((get): ReadonlySet<string> => new Set(get(mapItemSelectionAtom).map(mapItemKey)));

export const setMapItemSelectionAtom = atom(null, (_get, set, selection: readonly MapItemTarget[]) => {
  set(selectionStateAtom, selection);
  const primary = selection[selection.length - 1];
  set(SelectedItem, primary?.kind === "native" ? primary.index : undefined);
  set(SelectedCustomPlacementAtom, primary?.kind === "custom" ? primary.id : null);
});

export const selectMapItemAtom = atom(null, (get, set, request: {
  readonly target: MapItemTarget; readonly additive?: boolean; readonly forDrag?: boolean;
}) => {
  set(setMapItemSelectionAtom, selectMapItems(get(mapItemSelectionAtom), request.target,
    request.additive ?? false, request.forDrag ?? false));
});

export const mapItemSnapAtom = atom(false);
export const mapItemFocusRequestAtom = atom<{readonly target: MapItemTarget; readonly sequence: number} | null>(null);
export const mapItemDragPreviewAtom = atom<{
  readonly selection: readonly MapItemTarget[]; readonly x: number; readonly z: number;
} | null>(null);
export const mapItemDragPreviewKeysAtom = atom((get) => {
  const preview = get(mapItemDragPreviewAtom);
  return preview ? {keys: new Set(preview.selection.map(mapItemKey)), x: preview.x, z: preview.z} : null;
});

export function getMapItemPreviewOffset(
  target: MapItemTarget, preview: { readonly selection: readonly MapItemTarget[]; readonly x: number; readonly z: number } | null,
): { readonly x: number; readonly z: number } {
  return preview?.selection.some((item) => sameMapItem(item, target))
    ? { x: preview.x, z: preview.z } : { x: 0, z: 0 };
}
