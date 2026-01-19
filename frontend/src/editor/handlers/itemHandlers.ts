import { Updater } from "use-immer";
import { ItemData, LevelData } from "@/python/structSpecs/LevelTypes";
import { createMoveItemOperation, createUpdateItemParamsOperation } from "@/data/levelEdit/operationFactories";
import { GlobalsInterface } from "@/data/globals/globals";

/**
 * Create item movement handler
 * Returns a function that can be used in components
 */
export function createMoveItemHandler(
  setItemData: Updater<ItemData | null>,
  getLevelData: () => LevelData,
  globals: GlobalsInterface,
) {
  return (itemIndex: number, newX: number, newZ: number) => {
    const levelData = getLevelData();
    const operation = createMoveItemOperation(levelData, itemIndex, newX, newZ);
    if (!operation) return;

    setItemData((draft) => {
      if (!draft) return;
      const items = draft.Itms?.[1000]?.obj;
      if (items && items[itemIndex]) {
        items[itemIndex].x = operation.newX;
        items[itemIndex].z = operation.newZ;
      }
    });

    // Optionally track operation for undo/redo
    // undoStack.push(operation);
  };
}

/**
 * Create item parameter update handler
 */
export function createUpdateItemParamsHandler(
  setItemData: Updater<ItemData | null>,
  getLevelData: () => LevelData,
  globals: GlobalsInterface,
) {
  return (
    itemIndex: number,
    params: Partial<{ flags: number; p0: number; p1: number; p2: number; p3: number }>,
  ) => {
    const levelData = getLevelData();
    const operation = createUpdateItemParamsOperation(levelData, itemIndex, params);
    if (!operation) return;

    setItemData((draft) => {
      if (!draft) return;
      const item = draft.Itms?.[1000]?.obj?.[itemIndex];
      if (item) {
        if (params.flags !== undefined) item.flags = params.flags;
        if (params.p0 !== undefined) item.p0 = params.p0;
        if (params.p1 !== undefined) item.p1 = params.p1;
        if (params.p2 !== undefined) item.p2 = params.p2;
        if (params.p3 !== undefined) item.p3 = params.p3;
      }
    });
  };
}
