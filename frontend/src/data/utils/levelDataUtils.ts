import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import {
  HeaderData,
  ItemData,
  LiquidData,
  FenceData,
  SplineData,
  TerrainData,
} from "../../python/structSpecs/ottoMaticLevelData";

/**
 * Utility functions for combining and splitting level data between atomic types
 * and the complete ottoMaticLevel structure for file I/O operations
 */

export interface AtomicLevelData {
  headerData: HeaderData | null;
  itemData: ItemData | null;
  liquidData: LiquidData | null;
  fenceData: FenceData | null;
  splineData: SplineData | null;
  // Terrain and tile data (no longer using Partial)
  terrainData: TerrainData | null;
}

/**
 * Split a complete ottoMaticLevel into atomic data types
 */
export function splitLevelData(levelData: ottoMaticLevel | null): AtomicLevelData {
  if (!levelData) {
    return {
      headerData: null,
      itemData: null,
      liquidData: null,
      fenceData: null,
      splineData: null,
      terrainData: null,
    };
  }

  // Extract atomic data types
  const headerData: HeaderData = {
    Hedr: levelData.Hedr,
  };

  const itemData: ItemData = {
    Itms: levelData.Itms,
  };

  const liquidData: LiquidData = {
    Liqd: levelData.Liqd,
  };

  const fenceData: FenceData = {
    Fenc: levelData.Fenc,
    FnNb: levelData.FnNb,
  };

  const splineData: SplineData = {
    SpNb: levelData.SpNb,
    SpPt: levelData.SpPt,
    SpIt: levelData.SpIt,
    Spln: levelData.Spln,
  };

  // Extract terrain data (tiles, coordinates, etc.)
  const terrainData: TerrainData = {
    Atrb: levelData.Atrb,
    Timg: levelData.Timg,
    ItCo: levelData.ItCo,
    Layr: levelData.Layr,
    STgd: levelData.STgd,
    YCrd: levelData.YCrd,
    alis: levelData.alis,
    _metadata: levelData._metadata,
  };

  return {
    headerData,
    itemData,
    liquidData,
    fenceData,
    splineData,
    terrainData,
  };
}

/**
 * Combine atomic data types back into a complete ottoMaticLevel
 */
export function combineLevelData(atomicData: AtomicLevelData): ottoMaticLevel | null {
  const { headerData, itemData, liquidData, fenceData, splineData, terrainData } = atomicData;

  // If any required data is missing, return null
  if (!headerData || !itemData || !liquidData || !fenceData || !splineData || !terrainData) {
    return null;
  }

  return {
    ...terrainData,
    ...headerData,
    ...itemData,
    ...liquidData,
    ...fenceData,
    ...splineData,
  } as ottoMaticLevel;
}

/**
 * Check if all atomic data is available (not null)
 */
export function isAtomicDataComplete(atomicData: AtomicLevelData): boolean {
  return (
    atomicData.headerData !== null &&
    atomicData.itemData !== null &&
    atomicData.liquidData !== null &&
    atomicData.fenceData !== null &&
    atomicData.splineData !== null &&
    atomicData.terrainData !== null
  );
}