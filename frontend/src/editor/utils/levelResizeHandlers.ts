import type { GlobalsInterface } from "@/data/globals/globals";
import type { AtomicLevelData } from "@/data/utils/levelDataUtils";
import { combineLevelData, splitLevelData } from "@/data/utils/levelDataUtils";
import type { ResizeDirection } from "@/data/utils/levelResizeUtils";
import { resizeLevel } from "@/data/utils/levelResizeUtils";
import { err, ok, type Result } from "@/types/result";

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
): Result<ResizeAtomicDataResult, Error> {
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
): Result<ResizeAtomicDataResult, Error> {
  const combinedResult = combineLevelData(atomicData);
  if (combinedResult.isErr()) {
    return err(combinedResult.error);
  }

  const originalLevel = combinedResult.value;
  const resized = resizeLevel(originalLevel, globals, options);
  const resizedLevel = {
    ...resized.levelData,
    Itms: originalLevel.Itms,
    Fenc: originalLevel.Fenc,
    FnNb: originalLevel.FnNb,
    Liqd: originalLevel.Liqd,
    Spln: originalLevel.Spln,
    SpPt: originalLevel.SpPt,
  };

  return ok({
    data: splitLevelData(resizedLevel),
    warnings: resized.warnings.filter(
      (warning) => !warning.toLowerCase().includes("items were outside"),
    ),
  });
}
