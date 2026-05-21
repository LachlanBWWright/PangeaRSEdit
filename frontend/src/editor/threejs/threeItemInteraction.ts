import { err, ok, type Result } from "neverthrow";
import type {
  HeaderData,
  ItemData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import type { GlobalsInterface } from "@/data/globals/globals";
import { getTerrainHeightAtPoint } from "@/editor/threejs/fenceUtils/getTerrainHeightAtPoint";

export interface ThreeItemDragState {
  readonly itemIndex: number;
  readonly pointerId: number;
  readonly startItemX: number;
  readonly startItemZ: number;
  readonly startWorldX: number;
  readonly startWorldZ: number;
}

export interface ThreeItemInteractionState {
  readonly hoveredItemIndex: number | null;
  readonly selectedItemIndex: number | null;
  readonly drag: ThreeItemDragState | null;
}

export interface TerrainHeightError {
  readonly kind: "invalid-terrain-height";
  readonly x: number;
  readonly z: number;
}

export function createThreeItemDragState(
  itemIndex: number,
  pointerId: number,
  startItemX: number,
  startItemZ: number,
  startWorldX: number,
  startWorldZ: number,
): ThreeItemDragState {
  return {
    itemIndex,
    pointerId,
    startItemX,
    startItemZ,
    startWorldX,
    startWorldZ,
  };
}

export function getDraggedItemPlacement(
  drag: ThreeItemDragState,
  scale: number,
  worldX: number,
  worldZ: number,
): { readonly x: number; readonly z: number } {
  const deltaX = (worldX - drag.startWorldX) / scale;
  const deltaZ = (worldZ - drag.startWorldZ) / scale;
  return {
    x: Math.round(drag.startItemX + deltaX),
    z: Math.round(drag.startItemZ + deltaZ),
  };
}

export function sampleTerrainHeightForItemPlacement(
  x: number,
  z: number,
  headerData: HeaderData,
  terrainData: TerrainData,
  globals: GlobalsInterface,
): Result<number, TerrainHeightError> {
  const height = getTerrainHeightAtPoint(x, z, headerData, terrainData, globals);
  if (Number.isFinite(height)) {
    return ok(height);
  }
  return err({
    kind: "invalid-terrain-height",
    x,
    z,
  });
}

export function updateTerrainItemPlacement(
  itemData: ItemData | null,
  itemIndex: number,
  x: number,
  z: number,
): void {
  const item = itemData?.Itms?.[1000]?.obj?.[itemIndex];
  if (!item) {
    return;
  }
  item.x = x;
  item.z = z;
}
