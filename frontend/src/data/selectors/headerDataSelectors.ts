import { LevelData } from "@/python/structSpecs/LevelTypes";
import { HeaderData, StandardHeader } from "@/python/structSpecs/LevelTypes";
import { Updater } from "use-immer";

/**
 * Selects header data from the full level data
 */
export function selectHeaderData(levelData: LevelData): HeaderData | null {
  if (!levelData.Hedr) return null;

  return {
    Hedr: levelData.Hedr,
  };
}

/**
 * Gets the header object directly
 */
export function selectHeader(levelData: LevelData): StandardHeader | null {
  return levelData.Hedr?.[1000]?.obj || null;
}

/**
 * Updates header data in the full level data
 */
export function updateHeaderData(
  setLevelData: Updater<LevelData>,
  headerUpdate: Partial<StandardHeader>,
): void {
  setLevelData((draft) => {
    if (draft.Hedr?.[1000]?.obj) {
      Object.assign(draft.Hedr[1000].obj, headerUpdate);
    }
  });
}

/**
 * Creates a header data updater that only works with header data
 */
export function createHeaderDataUpdater(
  setLevelData: Updater<LevelData>,
): Updater<StandardHeader> {
  function applyHeaderUpdater(
    current: StandardHeader,
    updater: StandardHeader | ((draft: StandardHeader) => void),
  ): StandardHeader {
    if (typeof updater !== "function") return updater;
    updater(current);
    return current;
  }

  return (headerUpdater) => {
    setLevelData((draft) => {
      if (!draft.Hedr?.[1000]?.obj) return;
      draft.Hedr[1000].obj = applyHeaderUpdater(
        draft.Hedr[1000].obj,
        headerUpdater,
      );
    });
  };
}
