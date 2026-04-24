import {
  ItemData,
  TerrainItem,
  HeaderData,
} from "@/python/structSpecs/LevelTypes";
import { Updater } from "use-immer";

/**
 * Selects item data from the full level data
 */
export function selectItemData(levelData: ItemData): ItemData | null {
  if (!levelData.Itms) return null;

  return {
    Itms: levelData.Itms,
  };
}

/**
 * Gets the items array directly
 */
export function selectItems(levelData: ItemData): TerrainItem[] {
  return levelData.Itms?.[1000]?.obj || [];
}

/**
 * Gets a specific item by index
 */
export function selectItem(
  levelData: ItemData,
  itemIdx: number,
): TerrainItem | null {
  const items = selectItems(levelData);
  return items[itemIdx] || null;
}

/**
 * Updates a specific item in the full level data
 */
export function updateItem(
  setLevelData: Updater<ItemData>,
  itemIdx: number,
  itemUpdate: Partial<TerrainItem>,
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
  setLevelData: Updater<ItemData>,
  setHeaderData: Updater<HeaderData>,
  newItem: TerrainItem,
): void {
  setLevelData((draft) => {
    if (draft.Itms?.[1000]?.obj) {
      draft.Itms[1000].obj.push(newItem);
    }
  });

  // Update header count separately
  setHeaderData((hdr) => {
    if (!hdr) return hdr;
    hdr.Hedr[1000].obj.numItems =
      // Access latest item count via setLevelData caller; approximate by leaving current value
      hdr.Hedr[1000].obj.numItems + 1;
  });
}

/**
 * Removes an item from the level data
 */
export function removeItem(
  setLevelData: Updater<ItemData>,
  setHeaderData: Updater<HeaderData>,
  itemIdx: number,
): void {
  setLevelData((draft) => {
    if (
      draft.Itms?.[1000]?.obj &&
      itemIdx >= 0 &&
      itemIdx < draft.Itms[1000].obj.length
    ) {
      draft.Itms[1000].obj.splice(itemIdx, 1);
    }
  });

  // Decrement header count separately
  setHeaderData((hdr) => {
    if (!hdr) return hdr;
    hdr.Hedr[1000].obj.numItems = Math.max(0, hdr.Hedr[1000].obj.numItems - 1);
  });
}

/**
 * Creates an item-specific updater for a single item
 */
export function createItemUpdater(
  setLevelData: Updater<ItemData>,
  itemIdx: number,
): Updater<TerrainItem> {
  function applyItemUpdater(
    current: TerrainItem,
    updater: TerrainItem | ((draft: TerrainItem) => void),
  ): TerrainItem {
    if (typeof updater !== "function") return updater;
    updater(current);
    return current;
  }

  return (itemUpdater) => {
    setLevelData((draft) => {
      if (!draft.Itms?.[1000]?.obj?.[itemIdx]) return;
      draft.Itms[1000].obj[itemIdx] = applyItemUpdater(
        draft.Itms[1000].obj[itemIdx],
        itemUpdater,
      );
    });
  };
}
