import { Game, type GlobalsInterface } from "@/data/globals/globals";
import type { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import type { ScriptCustomObjectPlacement } from "../scripts/scriptWorkspaceState";
import { sampleTerrainHeightForItemPlacement } from "@/editor/threejs/threeItemInteraction";

export interface MapItemPoint { readonly x: number; readonly z: number }
export interface MapItemBounds { readonly width: number; readonly height: number }

export function centerMapItemStage(point: MapItemPoint, viewport: {readonly width: number; readonly height: number}, stage: {readonly x: number; readonly y: number; readonly scale: number}) {
  return {...stage, x: viewport.width / 2 - point.x * stage.scale, y: viewport.height / 2 - point.z * stage.scale};
}

export function getMapItemBounds(header: HeaderData, globals: GlobalsInterface): MapItemBounds {
  return { width: header.Hedr[1000].obj.mapWidth * globals.TILE_SIZE,
    height: header.Hedr[1000].obj.mapHeight * globals.TILE_SIZE };
}

export function isMapItemPointInside(point: MapItemPoint, bounds: MapItemBounds): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.z)
    && point.x >= 0 && point.z >= 0 && point.x < bounds.width && point.z < bounds.height;
}

export function snapMapItemPoint(point: MapItemPoint, tileSize: number, snap: boolean): MapItemPoint {
  const step = snap ? tileSize : 1;
  return { x: Math.round(point.x / step) * step, z: Math.round(point.z / step) * step };
}

export function customPlacementMapPoint(
  position: ScriptCustomObjectPlacement["position"], globals: GlobalsInterface,
): MapItemPoint {
  const scale = globals.TILE_INGAME_SIZE / globals.TILE_SIZE;
  return { x: position.x / scale,
    z: (globals.GAME_TYPE === Game.MIGHTY_MIKE ? position.y : position.z) / scale };
}

export function customPlacementWorldPoint(
  point: MapItemPoint, globals: GlobalsInterface, header: HeaderData, terrain: TerrainData,
): ScriptCustomObjectPlacement["position"] {
  const scale = globals.TILE_INGAME_SIZE / globals.TILE_SIZE;
  if (globals.GAME_TYPE === Game.MIGHTY_MIKE) return { x: point.x * scale, y: point.z * scale, z: 0 };
  const height = sampleTerrainHeightForItemPlacement(point.x, point.z, header, terrain, globals)
    .unwrapOr(header.Hedr[1000].obj.minY ?? 0);
  return { x: point.x * scale, y: height, z: point.z * scale };
}

export function moveCustomPlacementOnMap(
  placement: ScriptCustomObjectPlacement, point: MapItemPoint,
  globals: GlobalsInterface, header: HeaderData, terrain: TerrainData,
): ScriptCustomObjectPlacement {
  const position = customPlacementWorldPoint(point, globals, header, terrain);
  if (globals.GAME_TYPE === Game.MIGHTY_MIKE) return { ...placement, position: { ...position, z: placement.position.z } };
  const original = customPlacementMapPoint(placement.position, globals);
  const oldGround = customPlacementWorldPoint(original, globals, header, terrain).y;
  return { ...placement, position: { ...position, y: position.y + placement.position.y - oldGround } };
}
