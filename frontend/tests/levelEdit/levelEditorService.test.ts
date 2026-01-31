/**
 * Tests for Level Editor Service
 * 
 * Tests the undo/redo functionality and state management.
 */

import { describe, it, expect } from "vitest";
import type { HeaderData, ItemData, TerrainData } from "@/python/structSpecs/LevelTypes";
import type { MoveItemOperation } from "@/data/levelEdit/editOperations";
import {
  type EditableLevelData,
  createEditorState,
  applyEdit,
  undoEdit,
  redoEdit,
  canUndo,
  canRedo,
  clearHistory,
  getUndoCount,
  getRedoCount,
} from "@/data/levelEdit/levelEditorService";

/**
 * Create minimal test data with proper types
 */
function createTestData(): EditableLevelData {
  const headerData: HeaderData = {
    Hedr: {
      1000: {
        name: "Header",
        obj: {
          version: 1,
          numItems: 1,
          mapWidth: 32,
          mapHeight: 32,
          tileSize: 32,
          minY: 0,
          maxY: 100,
          numSplines: 0,
          numFences: 0,
          numTilePages: 1,
          numTiles: 1,
          numUniqueSupertiles: 1,
          numWaterPatches: 0,
          numCheckpoints: 0,
        },
        order: 0,
      },
    },
  };

  const itemData: ItemData = {
    Itms: {
      1000: {
        name: "Terrain Items List",
        obj: [
          { x: 100, z: 200, type: 1, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 },
        ],
        order: 0,
      },
    },
  };

  const terrainData: TerrainData = {
    Atrb: {
      1000: {
        name: "Tile Attribute Data",
        obj: [{ flags: 0, p0: 0, p1: 0 }],
        order: 1,
      },
    },
    ItCo: {
      1000: {
        name: "Terrain Items Color Array",
        data: "",
        order: 2,
      },
    },
    YCrd: {
      1000: {
        name: "Floor&Ceiling Y Coords",
        obj: new Array(32 * 32).fill(0),
        order: 3,
      },
    },
    alis: {
      1000: {
        name: "Texture Page Picture Alias",
        data: "",
        order: 10,
      },
    },
    _metadata: {
      file_attributes: 0,
      junk1: 0,
      junk2: 0,
    },
  };

  return {
    headerData,
    terrainData,
    itemData,
    splineData: null,
    fenceData: null,
    liquidData: null,
  };
}

describe("Level Editor Service", () => {
  describe("createEditorState", () => {
    it("creates initial state with empty history", () => {
      const data = createTestData();
      const state = createEditorState(data);

      expect(state.data).toBe(data);
      expect(state.undoStack).toHaveLength(0);
      expect(state.redoStack).toHaveLength(0);
      expect(state.isDirty).toBe(false);
    });
  });

  describe("applyEdit", () => {
    it("applies MoveItem operation", () => {
      const data = createTestData();
      const state = createEditorState(data);

      const op: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 100,
        oldZ: 200,
        newX: 150,
        newZ: 250,
      };

      const newState = applyEdit(state, op);

      // Check item was moved
      const item = newState.data.itemData?.Itms[1000].obj[0];
      expect(item?.x).toBe(150);
      expect(item?.z).toBe(250);

      // Check undo stack was updated
      expect(newState.undoStack).toHaveLength(1);
      expect(newState.redoStack).toHaveLength(0);
      expect(newState.isDirty).toBe(true);
    });

    it("clears redo stack on new edit", () => {
      const data = createTestData();
      let state = createEditorState(data);

      // Apply, undo, then apply new
      const op1: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 100,
        oldZ: 200,
        newX: 150,
        newZ: 250,
      };

      state = applyEdit(state, op1);
      const undoneState = undoEdit(state);
      expect(undoneState).not.toBeNull();
      if (!undoneState) return;

      expect(undoneState.redoStack).toHaveLength(1);

      // Apply new edit
      const op2: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 100,
        oldZ: 200,
        newX: 200,
        newZ: 300,
      };

      const newState = applyEdit(undoneState, op2);
      expect(newState.redoStack).toHaveLength(0);
    });
  });

  describe("undoEdit", () => {
    it("undoes the last operation", () => {
      const data = createTestData();
      let state = createEditorState(data);

      const op: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 100,
        oldZ: 200,
        newX: 150,
        newZ: 250,
      };

      state = applyEdit(state, op);
      const undoneState = undoEdit(state);

      expect(undoneState).not.toBeNull();
      if (!undoneState) return;

      // Check item was moved back
      const item = undoneState.data.itemData?.Itms[1000].obj[0];
      expect(item?.x).toBe(100);
      expect(item?.z).toBe(200);

      // Check stacks updated
      expect(undoneState.undoStack).toHaveLength(0);
      expect(undoneState.redoStack).toHaveLength(1);
    });

    it("returns null when nothing to undo", () => {
      const data = createTestData();
      const state = createEditorState(data);

      const result = undoEdit(state);
      expect(result).toBeNull();
    });
  });

  describe("redoEdit", () => {
    it("redoes the last undone operation", () => {
      const data = createTestData();
      let state = createEditorState(data);

      const op: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 100,
        oldZ: 200,
        newX: 150,
        newZ: 250,
      };

      state = applyEdit(state, op);
      const undoneState = undoEdit(state);
      expect(undoneState).not.toBeNull();
      if (!undoneState) return;

      const redoneState = redoEdit(undoneState);
      expect(redoneState).not.toBeNull();
      if (!redoneState) return;

      // Check item was moved forward again
      const item = redoneState.data.itemData?.Itms[1000].obj[0];
      expect(item?.x).toBe(150);
      expect(item?.z).toBe(250);

      // Check stacks updated
      expect(redoneState.undoStack).toHaveLength(1);
      expect(redoneState.redoStack).toHaveLength(0);
    });

    it("returns null when nothing to redo", () => {
      const data = createTestData();
      const state = createEditorState(data);

      const result = redoEdit(state);
      expect(result).toBeNull();
    });
  });

  describe("canUndo / canRedo", () => {
    it("canUndo returns false for empty state", () => {
      const data = createTestData();
      const state = createEditorState(data);
      expect(canUndo(state)).toBe(false);
    });

    it("canUndo returns true after edit", () => {
      const data = createTestData();
      let state = createEditorState(data);

      const op: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 100,
        oldZ: 200,
        newX: 150,
        newZ: 250,
      };

      state = applyEdit(state, op);
      expect(canUndo(state)).toBe(true);
    });

    it("canRedo returns true after undo", () => {
      const data = createTestData();
      let state = createEditorState(data);

      const op: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 100,
        oldZ: 200,
        newX: 150,
        newZ: 250,
      };

      state = applyEdit(state, op);
      const undoneState = undoEdit(state);
      expect(undoneState).not.toBeNull();
      if (!undoneState) return;

      expect(canRedo(undoneState)).toBe(true);
    });
  });

  describe("clearHistory", () => {
    it("clears undo and redo stacks", () => {
      const data = createTestData();
      let state = createEditorState(data);

      const op: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 100,
        oldZ: 200,
        newX: 150,
        newZ: 250,
      };

      state = applyEdit(state, op);
      const clearedState = clearHistory(state);

      expect(clearedState.undoStack).toHaveLength(0);
      expect(clearedState.redoStack).toHaveLength(0);
      expect(clearedState.isDirty).toBe(false);
    });
  });

  describe("getUndoCount / getRedoCount", () => {
    it("returns correct counts", () => {
      const data = createTestData();
      let state = createEditorState(data);

      expect(getUndoCount(state)).toBe(0);
      expect(getRedoCount(state)).toBe(0);

      const op: MoveItemOperation = {
        type: "MoveItem",
        itemIndex: 0,
        oldX: 100,
        oldZ: 200,
        newX: 150,
        newZ: 250,
      };

      state = applyEdit(state, op);
      expect(getUndoCount(state)).toBe(1);

      const undoneState = undoEdit(state);
      expect(undoneState).not.toBeNull();
      if (!undoneState) return;

      expect(getUndoCount(undoneState)).toBe(0);
      expect(getRedoCount(undoneState)).toBe(1);
    });
  });
});
