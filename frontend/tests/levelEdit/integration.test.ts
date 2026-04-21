/**
 * Integration tests for the level editing system
 */

import { describe, it, expect } from "vitest";
import {
  type MoveItemOperation,
  type AddItemOperation,
  type DeleteItemOperation,
  reverseOperation,
  canMergeOperations,
  mergeOperations,
} from "@/data/levelEdit/editOperations";
import {
  createMoveItemOperation,
  createUpdateItemParamsOperation,
} from "@/data/levelEdit/applyEdit";

describe("Level Edit Integration", () => {
  describe("Operation Creation", () => {
    it("creates move item operation", () => {
      const op = createMoveItemOperation(
        0, // itemIndex
        100, // oldX
        200, // oldZ
        300, // newX
        400  // newZ
      );
      
      expect(op.type).toBe("MoveItem");
      expect(op.itemIndex).toBe(0);
      expect(op.oldX).toBe(100);
      expect(op.oldZ).toBe(200);
      expect(op.newX).toBe(300);
      expect(op.newZ).toBe(400);
    });

    it("creates update item params operation", () => {
      const oldParams = { flags: 0, p0: 1, p1: 2, p2: 3, p3: 4 };
      const newParams = { flags: 1, p0: 10, p1: 20, p2: 30, p3: 40 };
      
      const op = createUpdateItemParamsOperation(5, oldParams, newParams);
      
      expect(op.type).toBe("UpdateItemParams");
      expect(op.itemIndex).toBe(5);
      expect(op.oldParams).toEqual(oldParams);
      expect(op.newParams).toEqual(newParams);
    });
  });

  describe("Operation Reversal", () => {
    it("reverses move item operation", () => {
      const original: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 5,
        oldX: 100,
        oldZ: 200,
        newX: 300,
        newZ: 400,
      };
      
      const reversed = reverseOperation(original);
      
      expect(reversed.type).toBe("MoveItem");
      if (reversed.type === "MoveItem") {
        expect(reversed.itemIndex).toBe(5);
        expect(reversed.oldX).toBe(300); // Swapped
        expect(reversed.oldZ).toBe(400);
        expect(reversed.newX).toBe(100);
        expect(reversed.newZ).toBe(200);
      }
    });

    it("reverses add item operation to delete", () => {
      const addOp: AddItemOperation = {
        type: "AddItem",
        item: {
          type: 1,
          x: 100,
          z: 200,
          flags: 0,
          p0: 0,
          p1: 0,
          p2: 0,
          p3: 0,
        },
        insertIndex: 5,
      };
      
      const reversed = reverseOperation(addOp);
      
      expect(reversed.type).toBe("DeleteItem");
      if (reversed.type === "DeleteItem") {
        expect(reversed.itemIndex).toBe(5);
        expect(reversed.deletedItem.type).toBe(1);
      }
    });

    it("reverses delete item operation to add", () => {
      const deleteOp: DeleteItemOperation = {
        type: "DeleteItem",
        itemIndex: 3,
        deletedItem: {
          type: 2,
          x: 500,
          z: 600,
          flags: 0,
          p0: 0,
          p1: 0,
          p2: 0,
          p3: 0,
        },
      };
      
      const reversed = reverseOperation(deleteOp);
      
      expect(reversed.type).toBe("AddItem");
      if (reversed.type === "AddItem") {
        expect(reversed.item.type).toBe(2);
        expect(reversed.insertIndex).toBe(3);
      }
    });
  });

  describe("Operation Merging", () => {
    it("can merge consecutive move operations on same item", () => {
      const op1: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 5,
        oldX: 100,
        oldZ: 200,
        newX: 150,
        newZ: 250,
      };
      
      const op2: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 5,
        oldX: 150,
        oldZ: 250,
        newX: 200,
        newZ: 300,
      };
      
      expect(canMergeOperations(op1, op2)).toBe(true);

      const mergeResult = mergeOperations(op1, op2);
      expect(mergeResult.isOk()).toBe(true);
      if (!mergeResult.isOk()) return; // Type guard

      const merged = mergeResult.value;
      expect(merged.type).toBe("MoveItem");
      if (merged.type === "MoveItem") {
        expect(merged.oldX).toBe(100);  // Original old position
        expect(merged.oldZ).toBe(200);
        expect(merged.newX).toBe(200);  // Final new position
        expect(merged.newZ).toBe(300);
      }
    });

    it("cannot merge operations on different items", () => {
      const op1: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 5,
        oldX: 100,
        oldZ: 200,
        newX: 150,
        newZ: 250,
      };
      
      const op2: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 6, // Different item
        oldX: 150,
        oldZ: 250,
        newX: 200,
        newZ: 300,
      };
      
      expect(canMergeOperations(op1, op2)).toBe(false);
    });

    it("cannot merge different operation types", () => {
      const moveOp: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 5,
        oldX: 100,
        oldZ: 200,
        newX: 150,
        newZ: 250,
      };
      
      const addOp: AddItemOperation = {
        type: "AddItem",
        item: {
          type: 1,
          x: 100,
          z: 200,
          flags: 0,
          p0: 0,
          p1: 0,
          p2: 0,
          p3: 0,
        },
      };
      
      expect(canMergeOperations(moveOp, addOp)).toBe(false);
    });
  });

  describe("Complex Scenarios", () => {
    it("double reversal returns to original", () => {
      const original: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 5,
        oldX: 100,
        oldZ: 200,
        newX: 300,
        newZ: 400,
      };
      
      const reversed = reverseOperation(original);
      const doubleReversed = reverseOperation(reversed);
      
      expect(doubleReversed).toEqual(original);
    });

    it("merged operations can be reversed", () => {
      const op1: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 3,
        oldX: 0,
        oldZ: 0,
        newX: 100,
        newZ: 100,
      };
      
      const op2: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 3,
        oldX: 100,
        oldZ: 100,
        newX: 200,
        newZ: 200,
      };
      
      const mergeResult = mergeOperations(op1, op2);
      expect(mergeResult.isOk()).toBe(true);
      if (!mergeResult.isOk()) return; // Type guard

      const merged = mergeResult.value;
      const reversed = reverseOperation(merged);

      // Reversing the merged operation should go back to original position
      if (reversed.type === "MoveItem") {
        expect(reversed.newX).toBe(0);
        expect(reversed.newZ).toBe(0);
      }
    });
  });
});
