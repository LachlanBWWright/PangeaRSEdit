/**
 * Level Edit Module
 * 
 * Exports all level editing types and functions for dependency injection
 * and testable edit operations.
 */

export {
  type EditOperation,
  type MoveItemOperation,
  type UpdateItemParamsOperation,
  type DeleteItemOperation,
  type AddItemOperation,
  type MoveSplineNubOperation,
  type AddSplineNubOperation,
  type DeleteSplineNubOperation,
  type MoveFenceNubOperation,
  type UpdateTerrainHeightOperation,
  type UpdateTileAttributeOperation,
  type ItemParams,
  type TileAttribute,
  reverseOperation,
  canMergeOperations,
  mergeOperations,
} from "./editOperations";

export {
  applyItemEditToDraft,
  applySplineEditToDraft,
  applyFenceEditToDraft,
  applyTerrainEditToDraft,
  createMoveItemOperation,
  createUpdateItemParamsOperation,
  createMoveSplineNubOperation,
} from "./applyEdit";

export {
  type EditableLevelData,
  type HistoryEntry,
  type LevelEditorState,
  createEditorState,
  applyEdit,
  undoEdit,
  redoEdit,
  canUndo,
  canRedo,
  clearHistory,
  applyBatchEdit,
  getUndoCount,
  getRedoCount,
} from "./levelEditorService";
