/**
 * Shared tile component types and interfaces
 */

import type { HeaderData, TerrainData, TileAttribute } from "@/python/structSpecs/LevelTypes";
import type { Updater } from "use-immer";

export interface BaseTileProps {
  headerData: HeaderData;
  setTerrainData: Updater<TerrainData>;
  tileGrid: TileAttribute[];
}

export interface TopologyTileProps {
  headerData: HeaderData;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  isEditingTopology: boolean;
}

export type TileColorMapperFn = (flags: number) => [number, number, number, number];
