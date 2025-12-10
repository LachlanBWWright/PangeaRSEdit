import {
  LevelData,
  HeaderData,
  ItemData,
  LiquidData,
  FenceData,
  SplineData,
  TerrainData,
} from "../../python/structSpecs/LevelTypes";
import { Result, ok, err } from "../../types/result";

/**
 * Utility functions for combining and splitting level data between atomic types
 * and the complete LevelData structure for file I/O operations
 */

export interface AtomicLevelData {
  headerData: HeaderData | null;
  itemData: ItemData | null;
  liquidData: LiquidData | null;
  fenceData: FenceData | null;
  splineData: SplineData | null;
  terrainData: TerrainData | null;
}

/**
 * Split a complete LevelData into atomic data types
 */
export function splitLevelData(
  levelData: LevelData | null,
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
  // Note: Bugdom 1 uses Layr + Xlat instead of STgd, so we allow either
  const hasTerrainData =
    levelData.ItCo &&
    (levelData.STgd || levelData.Layr) && // Either STgd (most games) or Layr (Bugdom 1)
    levelData.YCrd &&
    levelData._metadata;

  const terrainData: TerrainData | null = hasTerrainData
    ? {
        Atrb: levelData.Atrb,
        Timg: levelData.Timg,
        ItCo: levelData.ItCo,
        Layr: levelData.Layr,
        STgd: levelData.STgd,
        YCrd: levelData.YCrd,
        alis: levelData.alis,
        _metadata: levelData._metadata,
        ...(levelData.Xlat !== undefined ? { Xlat: levelData.Xlat } : {}),
        ...(levelData.Vcol !== undefined ? { Vcol: levelData.Vcol } : {}),
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
 * Combine atomic data types back into a complete LevelData
 * Returns a Result instead of throwing
 */
export function combineLevelData(
  atomicData: AtomicLevelData,
): Result<LevelData, Error> {
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
    return err(
      new Error("Cannot combine level data: atomic data is incomplete"),
    );
  }

  // All pieces are non-null here; safe to spread and satisfy the full level type
  return ok({
    ...terrainData,
    ...headerData,
    ...itemData,
    ...liquidData,
    ...fenceData,
    ...splineData,
  } satisfies LevelData);
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
