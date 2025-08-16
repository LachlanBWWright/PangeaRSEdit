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
export function splitLevelData(
  levelData: ottoMaticLevel | null,
): AtomicLevelData {
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

  // Extract atomic data types (guard against missing sub-objects)
  const headerData: HeaderData | null = levelData.Hedr
    ? { Hedr: levelData.Hedr }
    : null;

  const itemData: ItemData | null = levelData.Itms
    ? { Itms: levelData.Itms }
    : null;

  const liquidData: LiquidData | null = levelData.Liqd
    ? { Liqd: levelData.Liqd }
    : null;

  const fenceData: FenceData | null =
    levelData.Fenc && levelData.FnNb
      ? { Fenc: levelData.Fenc, FnNb: levelData.FnNb }
      : null;

  const splineData: SplineData | null =
    levelData.SpNb && levelData.SpPt && levelData.SpIt && levelData.Spln
      ? {
          SpNb: levelData.SpNb,
          SpPt: levelData.SpPt,
          SpIt: levelData.SpIt,
          Spln: levelData.Spln,
        }
      : null;

  // Extract terrain data (tiles, coordinates, etc.) - ensure all required parts exist
  const terrainData: TerrainData | null =
    //levelData.Atrb &&
    levelData.ItCo &&
    //levelData.Layr &&
    levelData.STgd &&
    levelData.YCrd &&
    //levelData.alis &&
    levelData._metadata
      ? {
          Atrb: levelData.Atrb,
          Timg: levelData.Timg,
          ItCo: levelData.ItCo,
          Layr: levelData.Layr,
          STgd: levelData.STgd,
          YCrd: levelData.YCrd,
          alis: levelData.alis,
          _metadata: levelData._metadata,
        }
      : null;

  // Log which atomic fields are missing (null)
  console.log("splitLevelData: null status", {
    headerData: headerData === null,
    itemData: itemData === null,
    liquidData: liquidData === null,
    fenceData: fenceData === null,
    splineData: splineData === null,
    terrainData: terrainData === null,
  });

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
export function combineLevelData(atomicData: AtomicLevelData): ottoMaticLevel {
  const {
    headerData,
    itemData,
    liquidData,
    fenceData,
    splineData,
    terrainData,
  } = atomicData;

  // Ensure all pieces are present before combining
  if (
    !headerData ||
    !itemData ||
    !liquidData ||
    !fenceData ||
    !splineData ||
    !terrainData
  ) {
    throw new Error("Cannot combine level data: atomic data is incomplete");
  }

  // All pieces are non-null here; safe to spread and satisfy the full level type
  return {
    ...terrainData,
    ...headerData,
    ...itemData,
    ...liquidData,
    ...fenceData,
    ...splineData,
  } satisfies ottoMaticLevel;
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
