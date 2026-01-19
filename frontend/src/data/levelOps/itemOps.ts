import type { TerrainItem } from "@/python/structSpecs/LevelTypes";
import type { LevelOpResult, LevelChange } from "./types";

/**
 * Generic level data type for level operations.
 * More permissive than the full LevelData type to allow partial structures.
 */
type LevelDataRecord = Record<string, unknown>;

/**
 * Add a new item to the level (pure function)
 */
export function addItem(
  levelData: LevelDataRecord,
  item: TerrainItem,
): LevelOpResult<{ levelData: LevelDataRecord; itemIdx: number }> {
  const itms = levelData.Itms as Record<string, { obj?: unknown[] }> | undefined;
  const items = itms?.[1000]?.obj;
  if (!items || !Array.isArray(items)) {
    return { success: false, error: "No items array in level data" };
  }

  const newItems = [...items, item];

  const newLevelData: LevelDataRecord = {
    ...levelData,
    Itms: {
      ...itms,
      1000: {
        ...itms?.[1000],
        obj: newItems,
      },
    },
  };

  // Update header numItems
  const hedr = newLevelData.Hedr as Record<string, { obj?: Record<string, unknown> }> | undefined;
  if (hedr?.[1000]?.obj) {
    newLevelData.Hedr = {
      ...hedr,
      1000: {
        ...hedr[1000],
        obj: {
          ...hedr[1000].obj,
          numItems: newItems.length,
        },
      },
    };
  }

  const change: LevelChange = {
    type: "item",
    operation: "add",
    path: ["Itms", "1000", "obj", String(newItems.length - 1)],
    newValue: item,
  };

  return {
    success: true,
    value: { levelData: newLevelData, itemIdx: newItems.length - 1 },
    changes: [change],
  };
}

/**
 * Update an existing item (pure function)
 */
export function updateItem(
  levelData: LevelData,
  itemIdx: number,
  updates: Partial<TerrainItem>,
): LevelOpResult<{ levelData: LevelData }> {
  const items = levelData.Itms?.[1000]?.obj;
  if (!items || itemIdx < 0 || itemIdx >= items.length) {
    return { success: false, error: "Invalid item index" };
  }

  const oldItem = items[itemIdx];
  if (!oldItem) {
    return { success: false, error: "Item not found" };
  }
  const newItem: TerrainItem = { ...oldItem, ...updates };
  const newItems = [...items];
  newItems[itemIdx] = newItem;

  const newLevelData: LevelData = {
    ...levelData,
    Itms: {
      ...levelData.Itms,
      1000: {
        ...levelData.Itms?.[1000],
        obj: newItems,
      },
    },
  };

  const change: LevelChange = {
    type: "item",
    operation: "update",
    path: ["Itms", "1000", "obj", String(itemIdx)],
    oldValue: oldItem,
    newValue: newItem,
  };

  return {
    success: true,
    value: { levelData: newLevelData },
    changes: [change],
  };
}

/**
 * Delete an item (pure function)
 */
export function deleteItem(
  levelData: LevelData,
  itemIdx: number,
): LevelOpResult<{ levelData: LevelData }> {
  const items = levelData.Itms?.[1000]?.obj;
  if (!items || itemIdx < 0 || itemIdx >= items.length) {
    return { success: false, error: "Invalid item index" };
  }

  const oldItem = items[itemIdx];
  const newItems = items.filter((_, idx) => idx !== itemIdx);

  const newLevelData: LevelData = {
    ...levelData,
    Itms: {
      ...levelData.Itms,
      1000: {
        ...levelData.Itms?.[1000],
        obj: newItems,
      },
    },
  };

  // Update header numItems
  if (newLevelData.Hedr?.[1000]?.obj) {
    newLevelData.Hedr = {
      ...newLevelData.Hedr,
      1000: {
        ...newLevelData.Hedr[1000],
        obj: {
          ...newLevelData.Hedr[1000].obj,
          numItems: newItems.length,
        },
      },
    };
  }

  const change: LevelChange = {
    type: "item",
    operation: "delete",
    path: ["Itms", "1000", "obj", String(itemIdx)],
    oldValue: oldItem,
  };

  return {
    success: true,
    value: { levelData: newLevelData },
    changes: [change],
  };
}

/**
 * Move an item to a new position (pure function)
 */
export function moveItem(
  levelData: LevelData,
  itemIdx: number,
  newX: number,
  newZ: number,
): LevelOpResult<{ levelData: LevelData }> {
  return updateItem(levelData, itemIdx, { x: newX, z: newZ });
}

/**
 * Set item parameters (pure function)
 */
export function setItemParams(
  levelData: LevelData,
  itemIdx: number,
  params: {
    p0?: number;
    p1?: number;
    p2?: number;
    p3?: number;
    flags?: number;
  },
): LevelOpResult<{ levelData: LevelData }> {
  return updateItem(levelData, itemIdx, params);
}

/**
 * Get an item by index
 */
export function getItem(
  levelData: LevelData,
  itemIdx: number,
): TerrainItem | undefined {
  return levelData.Itms?.[1000]?.obj?.[itemIdx];
}

/**
 * Get all items
 */
export function getAllItems(levelData: LevelData): TerrainItem[] {
  return levelData.Itms?.[1000]?.obj ?? [];
}
