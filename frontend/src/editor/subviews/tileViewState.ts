import type {
  TerrainData,
  TileAttribute,
} from "@/python/structSpecs/LevelTypes";
import { Game } from "@/data/globals/globals";
import { TileViews } from "@/data/tiles/tileAtoms";
import { TILENUM_MASK } from "./bugdom/BugdomTileRenderer.utils";

const EMPTY_TILE_ATTRIBUTE: TileAttribute = { flags: 0, p0: 0, p1: 0 };

export function getTileAttributeIndex(game: Game, layerValue: number): number {
  return game === Game.NANOSAUR ? layerValue & TILENUM_MASK : layerValue;
}

export function buildTileGrid(
  terrainData: TerrainData,
  game: Game,
): TileAttribute[] {
  const layrData = terrainData.Layr?.[1000]?.obj;
  const atrbData = terrainData.Atrb?.[1000]?.obj;
  if (!atrbData || !layrData) {
    return [];
  }

  return layrData.map(
    (layerValue) =>
      atrbData[getTileAttributeIndex(game, layerValue)] ?? EMPTY_TILE_ATTRIBUTE,
  );
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
