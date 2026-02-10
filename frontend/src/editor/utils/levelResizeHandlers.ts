import type { GlobalsInterface } from "@/data/globals/globals";
import type { AtomicLevelData } from "@/data/utils/levelDataUtils";
import { combineLevelData, splitLevelData } from "@/data/utils/levelDataUtils";
import type { ResizeDirection } from "@/data/utils/levelResizeUtils";
import { resizeLevel } from "@/data/utils/levelResizeUtils";

export interface ResizeUIOptions {
  direction: ResizeDirection;
  tileCount: number;
  defaultHeight: number;
}

export function applyResizeToAtomicData(
  atomicData: AtomicLevelData,
  globals: GlobalsInterface,
  options: ResizeUIOptions,
): { ok: boolean; data: AtomicLevelData; warnings: string[] } {
  const combinedResult = combineLevelData(atomicData);
  if (combinedResult.isErr()) {
    return {
      ok: false,
      data: atomicData,
      warnings: [combinedResult.error.message],
    };
  }

  const resized = resizeLevel(combinedResult.value, globals, options);
  return {
    ok: resized.ok,
    data: splitLevelData(resized.levelData),
    warnings: resized.warnings,
  };
}
