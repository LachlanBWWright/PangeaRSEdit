import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import { LiquidData, ottoLiquid } from "../../python/structSpecs/ottoMaticLevelData";
import { Updater } from "use-immer";

/**
 * Selects liquid/water data from the full level data
 */
export function selectLiquidData(levelData: ottoMaticLevel): LiquidData | null {
  if (!levelData.Liqd) return null;
  
  return {
    Liqd: levelData.Liqd
  };
}

/**
 * Gets the liquids array directly
 */
export function selectLiquids(levelData: ottoMaticLevel): ottoLiquid[] {
  return levelData.Liqd?.[1000]?.obj || [];
}

/**
 * Gets a specific liquid by index
 */
export function selectLiquid(levelData: ottoMaticLevel, liquidIdx: number): ottoLiquid | null {
  const liquids = selectLiquids(levelData);
  return liquids[liquidIdx] || null;
}

/**
 * Updates a specific liquid in the full level data
 */
export function updateLiquid(
  setLevelData: Updater<ottoMaticLevel>,
  liquidIdx: number,
  liquidUpdate: Partial<ottoLiquid>
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
  setLevelData: Updater<ottoMaticLevel>,
  newLiquid: ottoLiquid
): void {
  setLevelData((draft) => {
    if (draft.Liqd?.[1000]?.obj) {
      draft.Liqd[1000].obj.push(newLiquid);
      // Update header count
      if (draft.Hedr?.[1000]?.obj) {
        draft.Hedr[1000].obj.numWaterPatches = draft.Liqd[1000].obj.length;
      }
    }
  });
}

/**
 * Removes a liquid from the level data
 */
export function removeLiquid(
  setLevelData: Updater<ottoMaticLevel>,
  liquidIdx: number
): void {
  setLevelData((draft) => {
    if (draft.Liqd?.[1000]?.obj && liquidIdx >= 0 && liquidIdx < draft.Liqd[1000].obj.length) {
      draft.Liqd[1000].obj.splice(liquidIdx, 1);
      // Update header count
      if (draft.Hedr?.[1000]?.obj) {
        draft.Hedr[1000].obj.numWaterPatches = draft.Liqd[1000].obj.length;
      }
    }
  });
}

/**
 * Creates a liquid-specific updater for a single liquid
 */
export function createLiquidUpdater(
  setLevelData: Updater<ottoMaticLevel>,
  liquidIdx: number
): Updater<ottoLiquid> {
  return (liquidUpdater) => {
    setLevelData((draft) => {
      if (draft.Liqd?.[1000]?.obj?.[liquidIdx]) {
        if (typeof liquidUpdater === 'function') {
          liquidUpdater(draft.Liqd[1000].obj[liquidIdx]);
        } else {
          draft.Liqd[1000].obj[liquidIdx] = liquidUpdater;
        }
      }
    });
  };
}