import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import { HeaderData, ottoHeader } from "../../python/structSpecs/ottoMaticLevelData";
import { Updater } from "use-immer";

/**
 * Selects header data from the full level data
 */
export function selectHeaderData(levelData: ottoMaticLevel): HeaderData | null {
  if (!levelData.Hedr) return null;
  
  return {
    Hedr: levelData.Hedr
  };
}

/**
 * Gets the header object directly
 */
export function selectHeader(levelData: ottoMaticLevel): ottoHeader | null {
  return levelData.Hedr?.[1000]?.obj || null;
}

/**
 * Updates header data in the full level data
 */
export function updateHeaderData(
  setLevelData: Updater<ottoMaticLevel>,
  headerUpdate: Partial<ottoHeader>
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
  setLevelData: Updater<ottoMaticLevel>
): Updater<ottoHeader> {
  return (headerUpdater) => {
    setLevelData((draft) => {
      if (draft.Hedr?.[1000]?.obj) {
        if (typeof headerUpdater === 'function') {
          headerUpdater(draft.Hedr[1000].obj);
        } else {
          draft.Hedr[1000].obj = headerUpdater;
        }
      }
    });
  };
}