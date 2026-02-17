import { LevelData } from "@/python/structSpecs/LevelTypes";
import {
  LiquidData,
  Liquid,
  HeaderData,
} from "@/python/structSpecs/LevelTypes";
import { Updater } from "use-immer";

/**
 * Selects liquid/water data from the full level data
 */
export function selectLiquidData(levelData: LiquidData): LiquidData | null {
  if (!levelData.Liqd) return null;

  return {
    Liqd: levelData.Liqd,
  };
}

/**
 * Gets the liquids array directly
 */
export function selectLiquids(levelData: LiquidData): Liquid[] {
  return levelData.Liqd?.[1000]?.obj || [];
}

/**
 * Gets a specific liquid by index
 */
export function selectLiquid(
  levelData: LiquidData,
  liquidIdx: number,
): Liquid | null {
  const liquids = selectLiquids(levelData);
  return liquids[liquidIdx] || null;
}

/**
 * Updates a specific liquid in the full level data
 */
export function updateLiquid(
  setLevelData: Updater<LiquidData>,
  liquidIdx: number,
  liquidUpdate: Partial<Liquid>,
): void {
  setLevelData((draft) => {
    if (draft.Liqd?.[1000]?.obj?.[liquidIdx]) {
      Object.assign(draft.Liqd[1000].obj[liquidIdx], liquidUpdate);
    }
  });
}

/**
 * Adds a new liquid to the level data
 */
export function addLiquid(
  setLevelData: Updater<LevelData>,
  setHeaderData: Updater<HeaderData>,
  newLiquid: Liquid,
): void {
  setLevelData((draft) => {
    if (draft.Liqd?.[1000]?.obj) {
      draft.Liqd[1000].obj.push(newLiquid);
    }
  });

  setHeaderData((hdr) => {
    if (!hdr) return hdr;
    hdr.Hedr[1000].obj.numWaterPatches = hdr.Hedr[1000].obj.numWaterPatches + 1;
  });
}

/**
 * Removes a liquid from the level data
 */
export function removeLiquid(
  setLevelData: Updater<LevelData>,
  setHeaderData: Updater<HeaderData>,
  liquidIdx: number,
): void {
  setLevelData((draft) => {
    if (
      draft.Liqd?.[1000]?.obj &&
      liquidIdx >= 0 &&
      liquidIdx < draft.Liqd[1000].obj.length
    ) {
      draft.Liqd[1000].obj.splice(liquidIdx, 1);
    }
  });

  setHeaderData((hdr) => {
    if (!hdr) return hdr;
    hdr.Hedr[1000].obj.numWaterPatches = Math.max(
      0,
      hdr.Hedr[1000].obj.numWaterPatches - 1,
    );
  });
}

/**
 * Creates a liquid-specific updater for a single liquid
 */
export function createLiquidUpdater(
  setLevelData: Updater<LiquidData>,
  liquidIdx: number,
): Updater<Liquid> {
  return (liquidUpdater) => {
    setLevelData((draft) => {
      if (draft.Liqd?.[1000]?.obj?.[liquidIdx]) {
        if (typeof liquidUpdater === "function") {
          liquidUpdater(draft.Liqd[1000].obj[liquidIdx]);
        } else {
          draft.Liqd[1000].obj[liquidIdx] = liquidUpdater;
        }
      }
    });
  };
}
