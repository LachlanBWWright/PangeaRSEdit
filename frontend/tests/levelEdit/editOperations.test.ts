/**
 * Tests for Edit Operations
 * 
 * Tests the pure functions for applying and reversing edit operations.
 */

import { describe, it, expect } from "vitest";
import {
  reverseOperation,
  canMergeOperations,
  mergeOperations,
  type MoveItemOperation,
  type UpdateItemParamsOperation,
  type MoveSplineNubOperation,
} from "@/data/levelEdit/editOperations";
import {
  createMoveItemOperation,
  createMoveSplineNubOperation,
} from "@/data/levelEdit/applyEdit";

describe("Edit Operations", () => {
  describe("reverseOperation", () => {
    it("reverses MoveItem operation", () => {
      const op: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 100,
        oldZ: 200,
        newX: 150,
        newZ: 250,
      };

      const reversed = reverseOperation(op);

      expect(reversed.type).toBe("MoveItem");
      expect((reversed as MoveItemOperation).oldX).toBe(150);
      expect((reversed as MoveItemOperation).oldZ).toBe(250);
      expect((reversed as MoveItemOperation).newX).toBe(100);
      expect((reversed as MoveItemOperation).newZ).toBe(200);
    });

    it("reverses UpdateItemParams operation", () => {
      const op: UpdateItemParamsOperation = {
        type: "UpdateItemParams",
        itemIndex: 0,
        oldParams: { flags: 0, p0: 1, p1: 2, p2: 3, p3: 4 },
        newParams: { flags: 1, p0: 5, p1: 6, p2: 7, p3: 8 },
      };

      const reversed = reverseOperation(op);

      expect(reversed.type).toBe("UpdateItemParams");
      expect((reversed as UpdateItemParamsOperation).oldParams).toEqual({
        flags: 1,
        p0: 5,
        p1: 6,
        p2: 7,
        p3: 8,
      });
      expect((reversed as UpdateItemParamsOperation).newParams).toEqual({
        flags: 0,
        p0: 1,
        p1: 2,
        p2: 3,
        p3: 4,
      });
    });

    it("double reverse returns equivalent operation", () => {
      const op: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 5,
        oldX: 10,
        oldZ: 20,
        newX: 30,
        newZ: 40,
      };

      const doubleReversed = reverseOperation(reverseOperation(op));

      expect(doubleReversed).toEqual(op);
    });
  });

  describe("canMergeOperations", () => {
    it("returns true for consecutive MoveItem on same index", () => {
      const first: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 100,
        oldZ: 200,
        newX: 150,
        newZ: 250,
      };
      const second: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 150,
        oldZ: 250,
        newX: 200,
        newZ: 300,
      };

      expect(canMergeOperations(first, second)).toBe(true);
    });

    it("returns false for MoveItem on different indices", () => {
      const first: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 100,
        oldZ: 200,
        newX: 150,
        newZ: 250,
      };
      const second: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 1,
        oldX: 150,
        oldZ: 250,
        newX: 200,
        newZ: 300,
      };

      expect(canMergeOperations(first, second)).toBe(false);
    });

    it("returns false for different operation types", () => {
      const move: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 100,
        oldZ: 200,
        newX: 150,
        newZ: 250,
      };
      const update: UpdateItemParamsOperation = {
        type: "UpdateItemParams",
        itemIndex: 0,
        oldParams: { flags: 0, p0: 1, p1: 2, p2: 3, p3: 4 },
        newParams: { flags: 1, p0: 5, p1: 6, p2: 7, p3: 8 },
      };

      expect(canMergeOperations(move, update)).toBe(false);
    });
  });

  describe("mergeOperations", () => {
    it("merges consecutive MoveItem operations", () => {
      const first: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 100,
        oldZ: 200,
        newX: 150,
        newZ: 250,
      };
      const second: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 150,
        oldZ: 250,
        newX: 200,
        newZ: 300,
      };

      const merged = mergeOperations(first, second) as MoveItemOperation;

      expect(merged.type).toBe("MoveItem");
      expect(merged.itemIndex).toBe(0);
      expect(merged.oldX).toBe(100); // From first
      expect(merged.oldZ).toBe(200); // From first
      expect(merged.newX).toBe(200); // From second
      expect(merged.newZ).toBe(300); // From second
    });

    it("merges consecutive MoveSplineNub operations", () => {
      const first: MoveSplineNubOperation = {
        type: "MoveSplineNub",
        splineIndex: 0,
        nubIndex: 1,
        oldX: 0,
        oldZ: 0,
        newX: 10,
        newZ: 10,
      };
      const second: MoveSplineNubOperation = {
        type: "MoveSplineNub",
        splineIndex: 0,
        nubIndex: 1,
        oldX: 10,
        oldZ: 10,
        newX: 20,
        newZ: 20,
      };

      const merged = mergeOperations(first, second) as MoveSplineNubOperation;

      expect(merged.oldX).toBe(0);
      expect(merged.oldZ).toBe(0);
      expect(merged.newX).toBe(20);
      expect(merged.newZ).toBe(20);
    });
  });

  describe("createMoveItemOperation", () => {
    it("creates a valid MoveItem operation", () => {
      const op = createMoveItemOperation(3, 100, 200, 150, 250);

      expect(op.type).toBe("MoveItem");
      expect(op.itemIndex).toBe(3);
      expect(op.oldX).toBe(100);
      expect(op.oldZ).toBe(200);
      expect(op.newX).toBe(150);
      expect(op.newZ).toBe(250);
    });
  });

  describe("createMoveSplineNubOperation", () => {
    it("creates a valid MoveSplineNub operation", () => {
      const op = createMoveSplineNubOperation(1, 2, 10, 20, 30, 40);

      expect(op.type).toBe("MoveSplineNub");
      expect(op.splineIndex).toBe(1);
      expect(op.nubIndex).toBe(2);
      expect(op.oldX).toBe(10);
      expect(op.oldZ).toBe(20);
      expect(op.newX).toBe(30);
      expect(op.newZ).toBe(40);
    });
  });
});
