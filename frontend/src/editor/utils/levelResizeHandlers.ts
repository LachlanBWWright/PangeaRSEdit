import type { GlobalsInterface } from "@/data/globals/globals";
import type { AtomicLevelData } from "@/data/utils/levelDataUtils";
import { combineLevelData, splitLevelData } from "@/data/utils/levelDataUtils";
import type { ResizeDirection } from "@/data/utils/levelResizeUtils";
import {
  ITEM_BOUNDS_WARNING,
  resizeLevel,
  resizeFences,
  resizeSplines,
  resizeLiquids,
} from "@/data/utils/levelResizeUtils";
import { err, ok, type Result } from "neverthrow";

export interface ResizeUIOptions {
  direction: ResizeDirection;
  tileCount: number;
  defaultHeight: number;
}

export interface ResizeAtomicDataResult {
  data: AtomicLevelData;
  warnings: string[];
}

interface SupertileResizeMeasurements {
  terrainTileDelta: number;
  terrainOffsetX: number;
  terrainOffsetZ: number;
  entityOffsetXUnits: number;
  entityOffsetZUnits: number;
}

function getSupertileResizeMeasurements(
  globals: GlobalsInterface,
  options: ResizeUIOptions,
): SupertileResizeMeasurements {
  const supertileDelta = options.tileCount / globals.TILES_PER_SUPERTILE;
  const terrainOffsetX = options.direction === "left" ? options.tileCount : 0;
  const terrainOffsetZ = options.direction === "top" ? options.tileCount : 0;
  const entityOffsetXUnits =
    options.direction === "left"
      ? supertileDelta * globals.TILE_INGAME_SIZE
      : 0;
  const entityOffsetZUnits =
    options.direction === "top" ? supertileDelta * globals.TILE_INGAME_SIZE : 0;

  return {
    terrainTileDelta: options.tileCount,
    terrainOffsetX,
    terrainOffsetZ,
    entityOffsetXUnits,
    entityOffsetZUnits,
  };
}

function resizeItemsWithWorldOffsets(
  atomicData: AtomicLevelData,
  mapWidth: number,
  mapHeight: number,
  tileSize: number,
  offsetXUnits: number,
  offsetZUnits: number,
) {
  const items = atomicData.itemData?.Itms?.[1000]?.obj;
  if (!items || !atomicData.itemData?.Itms[1000]) {
    return atomicData.itemData;
  }

  const maxX = mapWidth * tileSize;
  const maxZ = mapHeight * tileSize;
  const adjusted = items
    .map((item) => ({
      ...item,
      x: item.x + offsetXUnits,
      z: item.z + offsetZUnits,
    }))
    .filter(
      (item) => item.x >= 0 && item.z >= 0 && item.x <= maxX && item.z <= maxZ,
    );

  return {
    ...atomicData.itemData,
    Itms: {
      ...atomicData.itemData.Itms,
      1000: {
        ...atomicData.itemData.Itms[1000],
        obj: adjusted,
      },
    },
  };
}

export function applyResizeToAtomicData(
  atomicData: AtomicLevelData,
  globals: GlobalsInterface,
  options: ResizeUIOptions,
): Result<ResizeAtomicDataResult, string> {
  const combinedResult = combineLevelData(atomicData);
  if (combinedResult.isErr()) {
    return err(combinedResult.error);
  }

  const resized = resizeLevel(combinedResult.value, globals, options);
  return ok({
    data: splitLevelData(resized.levelData),
    warnings: resized.warnings,
  });
}

export function applySupertileResizeToAtomicData(
  atomicData: AtomicLevelData,
  globals: GlobalsInterface,
  options: ResizeUIOptions,
): Result<ResizeAtomicDataResult, string> {
  const combinedResult = combineLevelData(atomicData);
  if (combinedResult.isErr()) {
    return err(combinedResult.error);
  }

  const originalLevel = combinedResult.value;
  const measurements = getSupertileResizeMeasurements(globals, options);
  const resized = resizeLevel(originalLevel, globals, {
    direction: options.direction,
    tileCount: measurements.terrainTileDelta,
    defaultHeight: options.defaultHeight,
  });

  const offsetXUnits = measurements.entityOffsetXUnits;
  const offsetZUnits = measurements.entityOffsetZUnits;

  const fencData =
    originalLevel.Fenc && originalLevel.FnNb
      ? resizeFences(
          { Fenc: originalLevel.Fenc, FnNb: originalLevel.FnNb },
          offsetXUnits,
          offsetZUnits,
        )
      : null;

  const splineResult =
    originalLevel.SpNb &&
    originalLevel.SpPt &&
    originalLevel.SpIt &&
    originalLevel.Spln
      ? resizeSplines(
          {
            SpNb: originalLevel.SpNb,
            SpPt: originalLevel.SpPt,
            SpIt: originalLevel.SpIt,
            Spln: originalLevel.Spln,
          },
          offsetXUnits,
          offsetZUnits,
        )
      : null;

  const liquidResult = originalLevel.Liqd
    ? resizeLiquids({ Liqd: originalLevel.Liqd }, offsetXUnits, offsetZUnits)
    : null;

  const resizedLevel = {
    ...resized.levelData,
    ...(resized.levelData.Hedr?.[1000]
      ? {
          Itms: resizeItemsWithWorldOffsets(
            atomicData,
            resized.levelData.Hedr[1000].obj.mapWidth,
            resized.levelData.Hedr[1000].obj.mapHeight,
            globals.TILE_INGAME_SIZE,
            offsetXUnits,
            offsetZUnits,
          )?.Itms,
        }
      : {}),
    ...(fencData ? { Fenc: fencData.Fenc, FnNb: fencData.FnNb } : {}),
    ...(splineResult
      ? {
          Spln: splineResult.Spln,
          SpNb: splineResult.SpNb,
          SpPt: splineResult.SpPt,
          SpIt: splineResult.SpIt,
        }
      : {}),
    ...(liquidResult ? { Liqd: liquidResult.Liqd } : {}),
  };

  return ok({
    data: splitLevelData(resizedLevel),
    warnings: resized.warnings.filter(
      (warning) => warning !== ITEM_BOUNDS_WARNING,
    ),
  });
}
