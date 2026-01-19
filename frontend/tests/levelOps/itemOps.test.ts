/**
 * Tests for pure item operations
 */

import { describe, it, expect } from "vitest";
import {
  addItem,
  updateItem,
  deleteItem,
  moveItem,
  setItemParams,
  getItem,
  getAllItems,
} from "@/data/levelOps/itemOps";
import type { LevelData, TerrainItem } from "@/python/structSpecs/LevelTypes";

// Helper to create minimal level data for testing
function createTestLevelData(items: TerrainItem[] = []): LevelData {
  return {
    Hedr: {
      1000: {
        obj: {
          mapWidth: 64,
          mapHeight: 64,
          numItems: items.length,
        },
      },
    },
    Itms: {
      1000: {
        obj: items,
      },
    },
  };
}

function createTestItem(overrides: Partial<TerrainItem> = {}): TerrainItem {
  return {
    x: 100,
    z: 100,
    type: 1,
    p0: 0,
    p1: 0,
    p2: 0,
    p3: 0,
    flags: 0,
    ...overrides,
  };
}

describe("itemOps", () => {
  describe("addItem", () => {
    it("should add item to empty level", () => {
      const levelData = createTestLevelData([]);
      const newItem = createTestItem({ x: 200, z: 300 });

      const result = addItem(levelData, newItem);

      expect(result.success).toBe(true);
      expect(result.value?.itemIdx).toBe(0);
      expect(result.value?.levelData.Itms?.[1000]?.obj).toHaveLength(1);
      expect(result.value?.levelData.Hedr?.[1000]?.obj?.numItems).toBe(1);
    });

    it("should add item to level with existing items", () => {
      const existingItem = createTestItem({ x: 50, z: 50 });
      const levelData = createTestLevelData([existingItem]);
      const newItem = createTestItem({ x: 200, z: 300 });

      const result = addItem(levelData, newItem);

      expect(result.success).toBe(true);
      expect(result.value?.itemIdx).toBe(1);
      expect(result.value?.levelData.Itms?.[1000]?.obj).toHaveLength(2);
      expect(result.value?.levelData.Hedr?.[1000]?.obj?.numItems).toBe(2);
    });

    it("should track the change for undo", () => {
      const levelData = createTestLevelData([]);
      const newItem = createTestItem();

      const result = addItem(levelData, newItem);

      expect(result.changes).toHaveLength(1);
      expect(result.changes?.[0]?.operation).toBe("add");
      expect(result.changes?.[0]?.type).toBe("item");
    });
  });

  describe("updateItem", () => {
    it("should update item position", () => {
      const item = createTestItem({ x: 100, z: 100 });
      const levelData = createTestLevelData([item]);

      const result = updateItem(levelData, 0, { x: 200, z: 300 });

      expect(result.success).toBe(true);
      const updatedItem = result.value?.levelData.Itms?.[1000]?.obj?.[0];
      expect(updatedItem?.x).toBe(200);
      expect(updatedItem?.z).toBe(300);
    });

    it("should update item parameters", () => {
      const item = createTestItem({ p0: 0, p1: 0 });
      const levelData = createTestLevelData([item]);

      const result = updateItem(levelData, 0, { p0: 5, p1: 10 });

      expect(result.success).toBe(true);
      const updatedItem = result.value?.levelData.Itms?.[1000]?.obj?.[0];
      expect(updatedItem?.p0).toBe(5);
      expect(updatedItem?.p1).toBe(10);
    });

    it("should fail for invalid index", () => {
      const levelData = createTestLevelData([]);

      const result = updateItem(levelData, 0, { x: 200 });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    it("should track both old and new values", () => {
      const item = createTestItem({ x: 100 });
      const levelData = createTestLevelData([item]);

      const result = updateItem(levelData, 0, { x: 200 });

      expect(result.changes?.[0]?.oldValue).toMatchObject({ x: 100 });
      expect(result.changes?.[0]?.newValue).toMatchObject({ x: 200 });
    });
  });

  describe("deleteItem", () => {
    it("should delete item", () => {
      const items = [
        createTestItem({ x: 100 }),
        createTestItem({ x: 200 }),
        createTestItem({ x: 300 }),
      ];
      const levelData = createTestLevelData(items);

      const result = deleteItem(levelData, 1);

      expect(result.success).toBe(true);
      expect(result.value?.levelData.Itms?.[1000]?.obj).toHaveLength(2);
      expect(result.value?.levelData.Hedr?.[1000]?.obj?.numItems).toBe(2);
    });

    it("should fail for invalid index", () => {
      const levelData = createTestLevelData([]);

      const result = deleteItem(levelData, 0);

      expect(result.success).toBe(false);
    });
  });

  describe("moveItem", () => {
    it("should move item to new position", () => {
      const item = createTestItem({ x: 100, z: 100 });
      const levelData = createTestLevelData([item]);

      const result = moveItem(levelData, 0, 500, 600);

      expect(result.success).toBe(true);
      const movedItem = result.value?.levelData.Itms?.[1000]?.obj?.[0];
      expect(movedItem?.x).toBe(500);
      expect(movedItem?.z).toBe(600);
    });
  });

  describe("setItemParams", () => {
    it("should set item parameters", () => {
      const item = createTestItem();
      const levelData = createTestLevelData([item]);

      const result = setItemParams(levelData, 0, { p0: 1, p1: 2, p3: 3 });

      expect(result.success).toBe(true);
      const updatedItem = result.value?.levelData.Itms?.[1000]?.obj?.[0];
      expect(updatedItem?.p0).toBe(1);
      expect(updatedItem?.p1).toBe(2);
      expect(updatedItem?.p3).toBe(3);
    });
  });

  describe("getItem / getAllItems", () => {
    it("should get item by index", () => {
      const item = createTestItem({ x: 123 });
      const levelData = createTestLevelData([item]);

      const result = getItem(levelData, 0);

      expect(result?.x).toBe(123);
    });

    it("should return undefined for invalid index", () => {
      const levelData = createTestLevelData([]);

      const result = getItem(levelData, 5);

      expect(result).toBeUndefined();
    });

    it("should get all items", () => {
      const items = [
        createTestItem({ x: 100 }),
        createTestItem({ x: 200 }),
      ];
      const levelData = createTestLevelData(items);

      const result = getAllItems(levelData);

      expect(result).toHaveLength(2);
    });
  });

  describe("immutability", () => {
    it("should not mutate original level data when adding", () => {
      const item = createTestItem();
      const levelData = createTestLevelData([item]);
      const originalItems = levelData.Itms?.[1000]?.obj;

      addItem(levelData, createTestItem({ x: 500 }));

      expect(levelData.Itms?.[1000]?.obj).toHaveLength(1);
      expect(levelData.Itms?.[1000]?.obj).toBe(originalItems);
    });

    it("should not mutate original level data when updating", () => {
      const item = createTestItem({ x: 100 });
      const levelData = createTestLevelData([item]);

      updateItem(levelData, 0, { x: 500 });

      expect(levelData.Itms?.[1000]?.obj?.[0]?.x).toBe(100);
    });

    it("should not mutate original level data when deleting", () => {
      const items = [createTestItem(), createTestItem()];
      const levelData = createTestLevelData(items);

      deleteItem(levelData, 0);

      expect(levelData.Itms?.[1000]?.obj).toHaveLength(2);
    });
  });
});
