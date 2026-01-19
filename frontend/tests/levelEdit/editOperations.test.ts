import { describe, it, expect } from "vitest";
import { levelEditor } from "@/data/levelEdit/levelEditorService";
import { reverseOperation, reverseOperations } from "@/data/levelEdit/editOperationReverse";
import { OttoGlobals } from "@/data/globals/globals";
import { LevelData } from "@/python/structSpecs/LevelTypes";

function createMockLevelData(overrides: Partial<any> = {}): LevelData {
    return {
        Hedr: {
            1000: {
                name: "Header",
                obj: {
                    version: 1,
                    numItems: 0,
                    mapWidth: 100,
                    mapHeight: 100,
                    tileSize: 32,
                    minY: 0,
                    maxY: 100,
                    numSplines: 0,
                    numFences: 0,
                    ...overrides.header
                },
                order: 0
            }
        },
        Itms: {
            1000: {
                name: "Terrain Items List",
                obj: Array(overrides.numItems || 0).fill(null).map((_, i) => ({
                    x: 100 + i * 10,
                    z: 200 + i * 10,
                    type: 1,
                    flags: 0,
                    p0: 0,
                    p1: 0,
                    p2: 0,
                    p3: 0
                })),
                order: 1
            }
        },
        YCrd: {
            1000: {
                name: "Floor&Ceiling Y Coords",
                obj: new Array(101 * 101).fill(0),
                order: 2
            }
        },
        Atrb: {
            1000: {
                name: "Tile Attribute Data",
                obj: new Array(100 * 100).fill({ flags: 0, p0: 0, p1: 0 }),
                order: 3
            }
        },
         ItCo: { 1000: { name: "", data: "", order: 0 } },
         _metadata: { file_attributes: 0, junk1: 0, junk2: 0 },
         ...overrides
    } as unknown as LevelData;
}

describe("Edit Operations", () => {
  describe("MoveItem", () => {
    it("should move item to new position", () => {
      const levelData = createMockLevelData({ numItems: 5 });
      const original = levelData.Itms![1000].obj[0];

      const result = levelEditor.applyOperation(levelData, {
        type: "MoveItem",
        itemIndex: 0,
        oldX: original.x,
        oldZ: original.z,
        newX: 500,
        newZ: 600,
      }, OttoGlobals);

      expect(result.Itms![1000].obj[0].x).toBe(500);
      expect(result.Itms![1000].obj[0].z).toBe(600);
    });

    it("should be reversible", () => {
      const op = {
        type: "MoveItem" as const,
        itemIndex: 0,
        oldX: 100,
        oldZ: 200,
        newX: 500,
        newZ: 600,
      };

      const reversed = reverseOperation(op);

      expect(reversed.type).toBe("MoveItem");
      expect(reversed.newX).toBe(100);
      expect(reversed.newZ).toBe(200);
      expect(reversed.oldX).toBe(500);
      expect(reversed.oldZ).toBe(600);
    });
  });

  describe("DeleteItem / AddItem", () => {
    it("delete should be reversed by add", () => {
      const levelData = createMockLevelData({ numItems: 5 });
      const item = levelData.Itms![1000].obj[2];

      // Delete item
      const afterDelete = levelEditor.applyOperation(levelData, {
        type: "DeleteItem",
        itemIndex: 2,
        deletedItem: item,
      }, OttoGlobals);

      expect(afterDelete.Itms![1000].obj.length).toBe(4);

      // Reverse (add back)
      const reverseOp = reverseOperation({
        type: "DeleteItem",
        itemIndex: 2,
        deletedItem: item,
      });

      const restored = levelEditor.applyOperation(afterDelete, reverseOp, OttoGlobals);

      expect(restored.Itms![1000].obj.length).toBe(5);
      expect(restored.Itms![1000].obj[2]).toEqual(item);
    });
  });
});
