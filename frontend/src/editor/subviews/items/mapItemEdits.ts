import type { TerrainItem } from "@/python/structSpecs/LevelTypes";
import type { ScriptCustomObjectPlacement } from "../scripts/scriptWorkspaceState";
import { mapItemKey, type MapItemTarget } from "./mapItemSelection";
import type { MapItemBounds, MapItemPoint } from "./mapItemCoordinates";

export interface MapItemSnapshot {
  readonly native: readonly { readonly index: number; readonly item: TerrainItem }[];
  readonly custom: readonly ScriptCustomObjectPlacement[];
}

export function captureMapItems(
  selection: readonly MapItemTarget[], items: readonly TerrainItem[], placements: readonly ScriptCustomObjectPlacement[],
): MapItemSnapshot {
  const keys = new Set(selection.map(mapItemKey));
  return { native: items.flatMap((item, index) => keys.has(mapItemKey({ kind: "native", index })) ? [{ index, item: { ...item } }] : []),
  custom: placements.filter((placement) => keys.has(mapItemKey({ kind: "custom", id: placement.id }))).map((placement) =>
    ({ ...placement, position: { ...placement.position } })) };
}

export function boundMapItemDelta(points: readonly MapItemPoint[], delta: MapItemPoint, bounds: MapItemBounds): MapItemPoint {
  if (points.length === 0) return { x: 0, z: 0 };
  const extrema = points.reduce((value, point) => ({minX: Math.min(value.minX, point.x), maxX: Math.max(value.maxX, point.x), minZ: Math.min(value.minZ, point.z), maxZ: Math.max(value.maxZ, point.z)}), {minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity});
  const {minX, maxX, minZ, maxZ} = extrema;
  const bound = (value: number, lower: number, upper: number) => lower > upper ? 0 : Math.max(lower, Math.min(upper, value));
  return { x: bound(delta.x, -minX, bounds.width - 1 - maxX),
    z: bound(delta.z, -minZ, bounds.height - 1 - maxZ) };
}

export function nextCustomPlacementId(placements: readonly ScriptCustomObjectPlacement[], objectId: string): string {
  let index = 1;
  while (placements.some((placement) => placement.id === `placement-${objectId}-${index}`)) index++;
  return `placement-${objectId}-${index}`;
}

export function deleteMapNativeItems(items: readonly TerrainItem[], selection: readonly MapItemTarget[]): TerrainItem[] {
  const keys = new Set(selection.map(mapItemKey));
  return items.filter((_item, index) => !keys.has(mapItemKey({kind: "native", index})));
}

export function moveMapNativeItems(items: readonly TerrainItem[], snapshot: MapItemSnapshot, delta: MapItemPoint): TerrainItem[] {
  const capturedItems = new Map(snapshot.native.map(entry => [entry.index, entry]));
  return items.map((item, index) => {
    const captured = capturedItems.get(index);
    return captured ? { ...item, x: Math.round(captured.item.x + delta.x), z: Math.round(captured.item.z + delta.z) } : item;
  });
}
