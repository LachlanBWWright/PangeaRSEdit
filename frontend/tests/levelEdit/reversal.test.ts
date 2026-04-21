/**
 * Tests for operation reversal consistency
 * 
 * These tests verify that edit operations can be correctly reversed
 * for undo/redo functionality, validating the dependency injection
 * approach from Plan 005.
 */

import { describe, it, expect } from "vitest";
import {
  type MoveItemOperation,
  type AddItemOperation,
  type DeleteItemOperation,
  type UpdateItemParamsOperation,
  reverseOperation,
  canMergeOperations,
  mergeOperations,
} from "@/data/levelEdit/editOperations";

describe("Operation Reversal Tests", () => {
  describe("Move Item Reversal", () => {
    it("correctly reverses move item operation", () => {
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
        expect(reversed.oldX).toBe(300);
        expect(reversed.oldZ).toBe(400);
        expect(reversed.newX).toBe(100);
        expect(reversed.newZ).toBe(200);
      }
    });

    it("double reversal returns original move", () => {
      const original: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 0,
        oldZ: 0,
        newX: 500,
        newZ: 500,
      };
      
      const reversed = reverseOperation(original);
      const doubleReversed = reverseOperation(reversed);
      
      expect(doubleReversed).toEqual(original);
    });
  });

  describe("Add/Delete Item Reversal", () => {
    it("reverses add to delete", () => {
      const addOp: AddItemOperation = {
        type: "AddItem",
        item: {
          type: 10,
          x: 100,
          z: 200,
          flags: 0,
          p0: 1,
          p1: 2,
          p2: 3,
          p3: 4,
        },
        insertIndex: 5,
      };
      
      const reversed = reverseOperation(addOp);
      
      expect(reversed.type).toBe("DeleteItem");
      if (reversed.type === "DeleteItem") {
        expect(reversed.itemIndex).toBe(5);
        expect(reversed.deletedItem.type).toBe(10);
      }
    });

    it("reverses delete to add", () => {
      const deleteOp: DeleteItemOperation = {
        type: "DeleteItem",
        itemIndex: 7,
        deletedItem: {
          type: 20,
          x: 300,
          z: 400,
          flags: 1,
          p0: 5,
          p1: 6,
          p2: 7,
          p3: 8,
        },
      };
      
      const reversed = reverseOperation(deleteOp);
      
      expect(reversed.type).toBe("AddItem");
      if (reversed.type === "AddItem") {
        expect(reversed.insertIndex).toBe(7);
        expect(reversed.item.type).toBe(20);
        expect(reversed.item.x).toBe(300);
        expect(reversed.item.z).toBe(400);
      }
    });

    it("add-delete reversal cycle preserves data", () => {
      const original: AddItemOperation = {
        type: "AddItem",
        item: {
          type: 99,
          x: 1000,
          z: 2000,
          flags: 15,
          p0: 10,
          p1: 20,
          p2: 30,
          p3: 40,
        },
        insertIndex: 10,
      };
      
      const reversed = reverseOperation(original);
      const doubleReversed = reverseOperation(reversed);
      
      expect(doubleReversed).toEqual(original);
    });
  });

  describe("Update Item Params Reversal", () => {
    it("correctly reverses param update", () => {
      const updateOp: UpdateItemParamsOperation = {
        type: "UpdateItemParams",
        itemIndex: 3,
        oldParams: { flags: 0, p0: 1, p1: 2, p2: 3, p3: 4 },
        newParams: { flags: 1, p0: 10, p1: 20, p2: 30, p3: 40 },
      };
      
      const reversed = reverseOperation(updateOp);
      
      expect(reversed.type).toBe("UpdateItemParams");
      if (reversed.type === "UpdateItemParams") {
        expect(reversed.itemIndex).toBe(3);
        expect(reversed.oldParams).toEqual({ flags: 1, p0: 10, p1: 20, p2: 30, p3: 40 });
        expect(reversed.newParams).toEqual({ flags: 0, p0: 1, p1: 2, p2: 3, p3: 4 });
      }
    });

    it("double reversal preserves params", () => {
      const original: UpdateItemParamsOperation = {
        type: "UpdateItemParams",
        itemIndex: 5,
        oldParams: { flags: 255, p0: 100, p1: 200, p2: 300, p3: 400 },
        newParams: { flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 },
      };
      
      const reversed = reverseOperation(original);
      const doubleReversed = reverseOperation(reversed);
      
      expect(doubleReversed).toEqual(original);
    });
  });

  describe("Operation Merging", () => {
    it("merges consecutive moves on same item", () => {
      const op1: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 0,
        oldZ: 0,
        newX: 50,
        newZ: 50,
      };
      
      const op2: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 50,
        oldZ: 50,
        newX: 100,
        newZ: 100,
      };
      
      expect(canMergeOperations(op1, op2)).toBe(true);

      const mergeResult = mergeOperations(op1, op2);
      expect(mergeResult.isOk()).toBe(true);
      if (!mergeResult.isOk()) return; // Type guard

      const merged = mergeResult.value;
      expect(merged.type).toBe("MoveItem");
      if (merged.type === "MoveItem") {
        expect(merged.oldX).toBe(0);
        expect(merged.oldZ).toBe(0);
        expect(merged.newX).toBe(100);
        expect(merged.newZ).toBe(100);
      }
    });

    it("cannot merge moves on different items", () => {
      const op1: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 0, oldZ: 0,
        newX: 100, newZ: 100,
      };
      
      const op2: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 1,
        oldX: 0, oldZ: 0,
        newX: 100, newZ: 100,
      };
      
      expect(canMergeOperations(op1, op2)).toBe(false);
    });

    it("cannot merge different operation types", () => {
      const moveOp: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 0, oldZ: 0,
        newX: 100, newZ: 100,
      };
      
      const addOp: AddItemOperation = {
        type: "AddItem",
        item: { type: 1, x: 0, z: 0, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 },
      };
      
      expect(canMergeOperations(moveOp, addOp)).toBe(false);
    });

    it("merged operation reverses correctly", () => {
      const op1: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 0, oldZ: 0,
        newX: 100, newZ: 100,
      };
      
      const op2: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 100, oldZ: 100,
        newX: 200, newZ: 200,
      };
      
      const mergeResult = mergeOperations(op1, op2);
      expect(mergeResult.isOk()).toBe(true);
      if (!mergeResult.isOk()) return; // Type guard

      const merged = mergeResult.value;
      const reversed = reverseOperation(merged);

      if (merged.type === "MoveItem" && reversed.type === "MoveItem") {
        // Merged: 0,0 -> 200,200
        // Reversed: 200,200 -> 0,0
        expect(reversed.oldX).toBe(200);
        expect(reversed.newX).toBe(0);
      }
    });
  });

  describe("Edge Cases", () => {
    it("handles zero coordinates", () => {
      const op: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 0,
        oldZ: 0,
        newX: 0,
        newZ: 0,
      };
      
      const reversed = reverseOperation(op);
      const doubleReversed = reverseOperation(reversed);
      
      expect(doubleReversed).toEqual(op);
    });

    it("handles negative coordinates", () => {
      const op: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: -100,
        oldZ: -200,
        newX: 100,
        newZ: 200,
      };
      
      const reversed = reverseOperation(op);
      
      if (reversed.type === "MoveItem") {
        expect(reversed.oldX).toBe(100);
        expect(reversed.oldZ).toBe(200);
        expect(reversed.newX).toBe(-100);
        expect(reversed.newZ).toBe(-200);
      }
    });

    it("handles large coordinate values", () => {
      const op: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 1000000,
        oldZ: 2000000,
        newX: 3000000,
        newZ: 4000000,
      };
      
      const reversed = reverseOperation(op);
      const doubleReversed = reverseOperation(reversed);
      
      expect(doubleReversed).toEqual(op);
    });
  });
});
