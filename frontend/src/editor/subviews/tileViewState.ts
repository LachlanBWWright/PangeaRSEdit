import type {
  TerrainData,
  TileAttribute,
} from "@/python/structSpecs/LevelTypes";
import { TileViews } from "@/data/tiles/tileAtoms";

export function buildTileGrid(terrainData: TerrainData): TileAttribute[] {
  const layrData = terrainData.Layr?.[1000]?.obj;
  const atrbData = terrainData.Atrb?.[1000]?.obj;
  if (!atrbData || !layrData) {
    return [];
  }

  return layrData
    .map((atrbIdx: number) => atrbData[atrbIdx])
    .filter((tile): tile is TileAttribute => tile !== undefined);
}

export function hasTopologyData(terrainData: TerrainData): boolean {
  return Boolean(terrainData.YCrd?.[1000]?.obj?.length);
}

export function getTileFlagBit(viewMode: TileViews): number {
  if (viewMode === TileViews.Flags) {
    return 1;
  }
  if (viewMode === TileViews.ElectricFloor0) {
    return 1 << 1;
  }
  return 1 << 2;
}

export function flagToVisibilityRgba(
  flag: number,
  flagBit: number,
): [number, number, number, number] {
  return flag & flagBit ? [255, 255, 255, 255] : [0, 0, 0, 0];
}
