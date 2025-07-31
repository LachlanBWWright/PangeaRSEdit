import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import { ItemData, ottoItem } from "../../python/structSpecs/ottoMaticLevelData";
import { Updater } from "use-immer";

/**
 * Selects item data from the full level data
 */
export function selectItemData(levelData: ottoMaticLevel): ItemData | null {
  if (!levelData.Itms) return null;
  
  return {
    Itms: levelData.Itms
  };
}

/**
 * Gets the items array directly
 */
export function selectItems(levelData: ottoMaticLevel): ottoItem[] {
  return levelData.Itms?.[1000]?.obj || [];
}

/**
 * Gets a specific item by index
 */
export function selectItem(levelData: ottoMaticLevel, itemIdx: number): ottoItem | null {
  const items = selectItems(levelData);
  return items[itemIdx] || null;
}

/**
 * Updates a specific item in the full level data
 */
export function updateItem(
  setLevelData: Updater<ottoMaticLevel>,
  itemIdx: number,
  itemUpdate: Partial<ottoItem>
): void {
  setLevelData((draft) => {
    if (draft.Itms?.[1000]?.obj?.[itemIdx]) {
      Object.assign(draft.Itms[1000].obj[itemIdx], itemUpdate);
    }
  });
}

/**
 * Adds a new item to the level data
 */
export function addItem(
  setLevelData: Updater<ottoMaticLevel>,
  newItem: ottoItem
): void {
  setLevelData((draft) => {
    if (draft.Itms?.[1000]?.obj) {
      draft.Itms[1000].obj.push(newItem);
      // Update header count
      if (draft.Hedr?.[1000]?.obj) {
        draft.Hedr[1000].obj.numItems = draft.Itms[1000].obj.length;
      }
    }
  });
}

/**
 * Removes an item from the level data
 */
export function removeItem(
  setLevelData: Updater<ottoMaticLevel>,
  itemIdx: number
): void {
  setLevelData((draft) => {
    if (draft.Itms?.[1000]?.obj && itemIdx >= 0 && itemIdx < draft.Itms[1000].obj.length) {
      draft.Itms[1000].obj.splice(itemIdx, 1);
      // Update header count
      if (draft.Hedr?.[1000]?.obj) {
        draft.Hedr[1000].obj.numItems = draft.Itms[1000].obj.length;
      }
    }
  });
}

/**
 * Creates an item-specific updater for a single item
 */
export function createItemUpdater(
  setLevelData: Updater<ottoMaticLevel>,
  itemIdx: number
): Updater<ottoItem> {
  return (itemUpdater) => {
    setLevelData((draft) => {
      if (draft.Itms?.[1000]?.obj?.[itemIdx]) {
        if (typeof itemUpdater === 'function') {
          itemUpdater(draft.Itms[1000].obj[itemIdx]);
        } else {
          draft.Itms[1000].obj[itemIdx] = itemUpdater;
        }
      }
    });
  };
}