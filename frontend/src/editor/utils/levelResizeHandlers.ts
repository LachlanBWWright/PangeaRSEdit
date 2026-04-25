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
  const resized = resizeLevel(originalLevel, globals, options);

  // Compute world-unit offset for objects that live in world coordinates.
  // options.tileCount is already in tiles (callers multiply supertileCount * TILES_PER_SUPERTILE).
  const tileSize = globals.TILE_INGAME_SIZE;
  const offsetXUnits =
    (options.direction === "left" ? options.tileCount : 0) * tileSize;
  const offsetZUnits =
    (options.direction === "top" ? options.tileCount : 0) * tileSize;

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
