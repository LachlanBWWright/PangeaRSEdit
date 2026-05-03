/**
 * Level Editor Service
 *
 * A service class that applies edit operations to level data using Immer.
 * This provides a clean interface for editing levels with full undo/redo support.
 */

import { produce, Draft } from "immer";
import type {
  HeaderData,
  TerrainData,
  ItemData,
  SplineData,
  FenceData,
  LiquidData,
} from "@/python/structSpecs/LevelTypes";
import { type EditOperation, reverseOperation } from "./editOperations";
import {
  applyItemEditToDraft,
  applySplineEditToDraft,
  applyFenceEditToDraft,
  applyTerrainEditToDraft,
} from "./applyEdit";

/**
 * Complete level data for editing
 */
export interface EditableLevelData {
  headerData: HeaderData;
  terrainData: TerrainData;
  itemData: ItemData | null;
  splineData: SplineData | null;
  fenceData: FenceData | null;
  liquidData: LiquidData | null;
}

/**
 * Edit history entry
 */
export interface HistoryEntry {
  operation: EditOperation;
  timestamp: number;
}

/**
 * Level Editor Service state
 */
export interface LevelEditorState {
  data: EditableLevelData;
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  isDirty: boolean;
}

/**
 * Creates initial editor state from level data
 */
export function createEditorState(data: EditableLevelData): LevelEditorState {
  return {
    data,
    undoStack: [],
    redoStack: [],
    isDirty: false,
  };
}

/**
 * Apply an edit operation to the editor state
 * Returns a new state with the operation applied and added to undo stack
 */
export function applyEdit(
  state: LevelEditorState,
  operation: EditOperation,
): LevelEditorState {
  const newData = applyOperationToData(state.data, operation);

  return {
    data: newData,
    undoStack: [...state.undoStack, { operation, timestamp: Date.now() }],
    redoStack: [], // Clear redo stack when new edit is made
    isDirty: true,
  };
}

/**
 * Undo the last operation
 * Returns null if nothing to undo
 */
export function undoEdit(state: LevelEditorState): LevelEditorState | null {
  const lastEntry = state.undoStack[state.undoStack.length - 1];
  if (!lastEntry) {
    return null;
  }

  const reverseOp = reverseOperation(lastEntry.operation);
  const newData = applyOperationToData(state.data, reverseOp);

  return {
    data: newData,
    undoStack: state.undoStack.slice(0, -1),
    redoStack: [...state.redoStack, lastEntry],
    isDirty: state.undoStack.length > 1,
  };
}

/**
 * Redo the last undone operation
 * Returns null if nothing to redo
 */
export function redoEdit(state: LevelEditorState): LevelEditorState | null {
  const lastEntry = state.redoStack[state.redoStack.length - 1];
  if (!lastEntry) {
    return null;
  }

  const newData = applyOperationToData(state.data, lastEntry.operation);

  return {
    data: newData,
    undoStack: [...state.undoStack, lastEntry],
    redoStack: state.redoStack.slice(0, -1),
    isDirty: true,
  };
}

/**
 * Check if undo is available
 */
export function canUndo(state: LevelEditorState): boolean {
  return state.undoStack.length > 0;
}

/**
 * Check if redo is available
 */
export function canRedo(state: LevelEditorState): boolean {
  return state.redoStack.length > 0;
}

/**
 * Clear all history and mark as clean
 */
export function clearHistory(state: LevelEditorState): LevelEditorState {
  return {
    ...state,
    undoStack: [],
    redoStack: [],
    isDirty: false,
  };
}

/**
 * Apply operation to level data using Immer
 */
function applyItemEdit(
  data: EditableLevelData,
  operation: EditOperation,
): EditableLevelData {
  if (!data.itemData) return data;
  return {
    ...data,
    itemData: produce(data.itemData, (draft: Draft<ItemData>) => {
      applyItemEditToDraft(draft, operation);
    }),
  };
}

function applySplineEdit(
  data: EditableLevelData,
  operation: EditOperation,
): EditableLevelData {
  if (!data.splineData) return data;
  return {
    ...data,
    splineData: produce(data.splineData, (draft: Draft<SplineData>) => {
      applySplineEditToDraft(draft, operation);
    }),
  };
}

function applyFenceEdit(
  data: EditableLevelData,
  operation: EditOperation,
): EditableLevelData {
  if (!data.fenceData) return data;
  return {
    ...data,
    fenceData: produce(data.fenceData, (draft: Draft<FenceData>) => {
      applyFenceEditToDraft(draft, operation);
    }),
  };
}

function applyTerrainEdit(
  data: EditableLevelData,
  operation: EditOperation,
  mapWidth: number,
): EditableLevelData {
  return {
    ...data,
    terrainData: produce(data.terrainData, (draft: Draft<TerrainData>) => {
      applyTerrainEditToDraft(draft, operation, mapWidth);
    }),
  };
}

function applyOperationToData(
  data: EditableLevelData,
  operation: EditOperation,
): EditableLevelData {
  const mapWidth = data.headerData.Hedr[1000].obj.mapWidth;

  switch (operation.type) {
    case "MoveItem":
    case "UpdateItemParams":
    case "DeleteItem":
    case "AddItem":
      return applyItemEdit(data, operation);
    case "MoveSplineNub":
    case "AddSplineNub":
    case "DeleteSplineNub":
      return applySplineEdit(data, operation);
    case "MoveFenceNub":
      return applyFenceEdit(data, operation);
    case "UpdateTerrainHeight":
    case "UpdateTileAttribute":
      return applyTerrainEdit(data, operation, mapWidth);
    default:
      return data;
  }
}

/**
 * Batch multiple operations into a single undo entry
 */
export function applyBatchEdit(
  state: LevelEditorState,
  operations: EditOperation[],
): LevelEditorState {
  if (operations.length === 0) {
    return state;
  }

  // Apply all operations
  let newData = state.data;
  for (const op of operations) {
    newData = applyOperationToData(newData, op);
  }

  // Create a composite operation for undo
  // For simplicity, we store the first operation but could implement composite operations
  const firstOp = operations[0];
  if (!firstOp) return state;

  return {
    data: newData,
    undoStack: [
      ...state.undoStack,
      { operation: firstOp, timestamp: Date.now() },
    ],
    redoStack: [],
    isDirty: true,
  };
}

/**
 * Get the number of operations in the undo stack
 */
export function getUndoCount(state: LevelEditorState): number {
  return state.undoStack.length;
}

/**
 * Get the number of operations in the redo stack
 */
export function getRedoCount(state: LevelEditorState): number {
  return state.redoStack.length;
}
