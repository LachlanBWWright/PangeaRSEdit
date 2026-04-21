/**
 * Tests for Apply Edit Functions
 * 
 * Tests the pure functions for applying edit operations to level data.
 */

import { describe, it, expect } from "vitest";
import { produce } from "immer";
import type { ItemData } from "@/python/structSpecs/LevelTypes";
import type {
  MoveItemOperation,
  UpdateItemParamsOperation,
  DeleteItemOperation,
  AddItemOperation,
} from "@/data/levelEdit/editOperations";
import {
  applyItemEditToDraft,
  createMoveItemOperation,
  createUpdateItemParamsOperation,
} from "@/data/levelEdit/applyEdit";

/**
 * Create minimal test item data
 */
function createTestItemData(): ItemData {
  return {
    Itms: {
      1000: {
        name: "Terrain Items List",
        obj: [
          { x: 100, z: 200, type: 1, flags: 0, p0: 10, p1: 20, p2: 30, p3: 40 },
          { x: 300, z: 400, type: 2, flags: 1, p0: 11, p1: 21, p2: 31, p3: 41 },
          { x: 500, z: 600, type: 3, flags: 2, p0: 12, p1: 22, p2: 32, p3: 42 },
        ],
        order: 0,
      },
    },
  };
}

describe("Apply Edit Functions", () => {
  describe("applyItemEditToDraft - MoveItem", () => {
    it("moves item to new position", () => {
      const itemData = createTestItemData();
      const op: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 1,
        oldX: 300,
        oldZ: 400,
        newX: 350,
        newZ: 450,
      };

      const result = produce(itemData, (draft) => {
        applyItemEditToDraft(draft, op);
      });

      const movedItem = result.Itms[1000].obj[1];
      expect(movedItem?.x).toBe(350);
      expect(movedItem?.z).toBe(450);
      // Type and other properties should be unchanged
      expect(movedItem?.type).toBe(2);
      expect(movedItem?.flags).toBe(1);
    });

    it("does not affect other items", () => {
      const itemData = createTestItemData();
      const op: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 1,
        oldX: 300,
        oldZ: 400,
        newX: 350,
        newZ: 450,
      };

      const result = produce(itemData, (draft) => {
        applyItemEditToDraft(draft, op);
      });

      // First item unchanged
      expect(result.Itms[1000].obj[0]?.x).toBe(100);
      expect(result.Itms[1000].obj[0]?.z).toBe(200);
      // Third item unchanged
      expect(result.Itms[1000].obj[2]?.x).toBe(500);
      expect(result.Itms[1000].obj[2]?.z).toBe(600);
    });

    it("handles out of bounds index gracefully", () => {
      const itemData = createTestItemData();
      const op: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 99,
        oldX: 0,
        oldZ: 0,
        newX: 100,
        newZ: 100,
      };

      // Should not throw
      const result = produce(itemData, (draft) => {
        applyItemEditToDraft(draft, op);
      });

      // All items should be unchanged
      expect(result.Itms[1000].obj).toHaveLength(3);
    });
  });

  describe("applyItemEditToDraft - UpdateItemParams", () => {
    it("updates item parameters", () => {
      const itemData = createTestItemData();
      const op: UpdateItemParamsOperation = {
        type: "UpdateItemParams",
        itemIndex: 0,
        oldParams: { flags: 0, p0: 10, p1: 20, p2: 30, p3: 40 },
        newParams: { flags: 5, p0: 100, p1: 200, p2: 300, p3: 400 },
      };

      const result = produce(itemData, (draft) => {
        applyItemEditToDraft(draft, op);
      });

      const item = result.Itms[1000].obj[0];
      expect(item?.flags).toBe(5);
      expect(item?.p0).toBe(100);
      expect(item?.p1).toBe(200);
      expect(item?.p2).toBe(300);
      expect(item?.p3).toBe(400);
    });

    it("preserves position when updating params", () => {
      const itemData = createTestItemData();
      const op: UpdateItemParamsOperation = {
        type: "UpdateItemParams",
        itemIndex: 0,
        oldParams: { flags: 0, p0: 10, p1: 20, p2: 30, p3: 40 },
        newParams: { flags: 5, p0: 100, p1: 200, p2: 300, p3: 400 },
      };

      const result = produce(itemData, (draft) => {
        applyItemEditToDraft(draft, op);
      });

      const item = result.Itms[1000].obj[0];
      expect(item?.x).toBe(100);
      expect(item?.z).toBe(200);
      expect(item?.type).toBe(1);
    });
  });

  describe("applyItemEditToDraft - DeleteItem", () => {
    it("deletes item at specified index", () => {
      const itemData = createTestItemData();
      const deletedItem = itemData.Itms[1000].obj[1];
      if (!deletedItem) expect.fail("Expected item to exist");

      const op: DeleteItemOperation = {
        type: "DeleteItem",
        itemIndex: 1,
        deletedItem,
      };

      const result = produce(itemData, (draft) => {
        applyItemEditToDraft(draft, op);
      });

      expect(result.Itms[1000].obj).toHaveLength(2);
      // First item unchanged
      expect(result.Itms[1000].obj[0]?.x).toBe(100);
      // Third item is now at index 1
      expect(result.Itms[1000].obj[1]?.x).toBe(500);
    });

    it("handles delete of last item with -1 index", () => {
      const itemData = createTestItemData();
      const deletedItem = itemData.Itms[1000].obj[2];
      if (!deletedItem) expect.fail("Expected item to exist");

      const op: DeleteItemOperation = {
        type: "DeleteItem",
        itemIndex: -1,
        deletedItem,
      };

      const result = produce(itemData, (draft) => {
        applyItemEditToDraft(draft, op);
      });

      expect(result.Itms[1000].obj).toHaveLength(2);
      // First two items unchanged
      expect(result.Itms[1000].obj[0]?.x).toBe(100);
      expect(result.Itms[1000].obj[1]?.x).toBe(300);
    });
  });

  describe("applyItemEditToDraft - AddItem", () => {
    it("adds item at end", () => {
      const itemData = createTestItemData();
      const op: AddItemOperation = {
        type: "AddItem",
        item: { x: 700, z: 800, type: 4, flags: 3, p0: 0, p1: 0, p2: 0, p3: 0 },
      };

      const result = produce(itemData, (draft) => {
        applyItemEditToDraft(draft, op);
      });

      expect(result.Itms[1000].obj).toHaveLength(4);
      const newItem = result.Itms[1000].obj[3];
      expect(newItem?.x).toBe(700);
      expect(newItem?.z).toBe(800);
      expect(newItem?.type).toBe(4);
    });

    it("inserts item at specified index", () => {
      const itemData = createTestItemData();
      const op: AddItemOperation = {
        type: "AddItem",
        item: { x: 250, z: 350, type: 9, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 },
        insertIndex: 1,
      };

      const result = produce(itemData, (draft) => {
        applyItemEditToDraft(draft, op);
      });

      expect(result.Itms[1000].obj).toHaveLength(4);
      // New item at index 1
      expect(result.Itms[1000].obj[1]?.x).toBe(250);
      expect(result.Itms[1000].obj[1]?.type).toBe(9);
      // Original item moved to index 2
      expect(result.Itms[1000].obj[2]?.x).toBe(300);
    });
  });

  describe("Factory Functions", () => {
    it("createMoveItemOperation creates valid operation", () => {
      const op = createMoveItemOperation(5, 100, 200, 150, 250);

      expect(op.type).toBe("MoveItem");
      expect(op.itemIndex).toBe(5);
      expect(op.oldX).toBe(100);
      expect(op.oldZ).toBe(200);
      expect(op.newX).toBe(150);
      expect(op.newZ).toBe(250);
    });

    it("createUpdateItemParamsOperation creates valid operation", () => {
      const oldParams = { flags: 0, p0: 1, p1: 2, p2: 3, p3: 4 };
      const newParams = { flags: 1, p0: 10, p1: 20, p2: 30, p3: 40 };
      const op = createUpdateItemParamsOperation(3, oldParams, newParams);

      expect(op.type).toBe("UpdateItemParams");
      expect(op.itemIndex).toBe(3);
      expect(op.oldParams).toEqual(oldParams);
      expect(op.newParams).toEqual(newParams);
    });
  });
});
