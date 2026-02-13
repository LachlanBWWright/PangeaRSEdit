/**
 * IntroPrompt Utilities
 *
 * Pure functions extracted from IntroPrompt to avoid closures within React components.
 * These functions handle undo/redo logic, history management, and map saving.
 */

import { Updater } from "use-immer";
import {
  AtomicLevelData,
  isAtomicDataComplete,
} from "../../data/utils/levelDataUtils";
import { ottoPreprocessor } from "../../data/processors/ottoPreprocessor";
import type { GlobalsInterface } from "../../data/globals/globals";
import type { LevelData } from "../../python/structSpecs/LevelTypes";

/**
 * History state interface for undo/redo functionality
 */
export interface DataHistory {
  items: AtomicLevelData[];
  index: number;
}

/**
 * Create the current atomic data object from individual state pieces.
 * This is a pure function that doesn't close over any React state.
 */
export function createAtomicData(
  headerData: AtomicLevelData["headerData"],
  itemData: AtomicLevelData["itemData"],
  liquidData: AtomicLevelData["liquidData"],
  fenceData: AtomicLevelData["fenceData"],
  splineData: AtomicLevelData["splineData"],
  terrainData: AtomicLevelData["terrainData"]
): AtomicLevelData {
  return {
    headerData,
    itemData,
    liquidData,
    fenceData,
    splineData,
    terrainData,
  };
}

/**
 * Update history when data changes.
 * Returns the new history state, or null if no update is needed.
 */
export function updateHistory(
  currentHistory: DataHistory,
  currentData: AtomicLevelData,
  blockUpdate: boolean
): DataHistory | null {
  // Don't update history if change is coming from undo/redo
  if (blockUpdate) {
    return null;
  }

  // Don't add incomplete data to history
  if (!isAtomicDataComplete(currentData)) {
    // Return empty history for new/incomplete data
    if (currentHistory.items.length > 0) {
      return { items: [], index: 0 };
    }
    return null;
  }

  // Create new history with the current data
  const newItems = [
    ...currentHistory.items.slice(0, currentHistory.index + 1),
    currentData,
  ];

  // Limit history size
  const finalItems =
    newItems.length > 10 ? newItems.slice(newItems.length - 10) : newItems;

  return {
    items: finalItems,
    index: finalItems.length - 1,
  };
}

/**
 * Calculate the result of an undo operation.
 * Returns null if undo is not possible, otherwise returns the previous state.
 */
export function calculateUndo(
  history: DataHistory
): { newIndex: number; data: AtomicLevelData } | null {
  if (history.index <= 0) {
    return null;
  }

  const newIndex = history.index - 1;
  const historyItem = history.items[newIndex];

  if (!historyItem) {
    return null;
  }

  return { newIndex, data: historyItem };
}

/**
 * Calculate the result of a redo operation.
 * Returns null if redo is not possible, otherwise returns the next state.
 */
export function calculateRedo(
  history: DataHistory
): { newIndex: number; data: AtomicLevelData } | null {
  if (history.index >= history.items.length - 1) {
    return null;
  }

  const newIndex = history.index + 1;
  const historyItem = history.items[newIndex];

  if (!historyItem) {
    return null;
  }

  return { newIndex, data: historyItem };
}

/**
 * Create handlers for undo/redo operations.
 */
export function createUndoHandler(
  history: DataHistory,
  setDataHistory: Updater<DataHistory>,
  setAllAtomicData: (data: AtomicLevelData) => void,
  setBlockHistoryUpdate: (value: boolean) => void
): () => void {
  return () => {
    const result = calculateUndo(history);
    if (result) {
      setDataHistory((draft) => {
        draft.index = result.newIndex;
      });
      setAllAtomicData(result.data);
      setBlockHistoryUpdate(true);
    }
  };
}

/**
 * Create handlers for redo operations.
 * Returns a function that advances to the next history state when called.
 */
export function createRedoHandler(
  history: DataHistory,
  setDataHistory: Updater<DataHistory>,
  setAllAtomicData: (data: AtomicLevelData) => void,
  setBlockHistoryUpdate: (value: boolean) => void
): () => void {
  return () => {
    const result = calculateRedo(history);
    if (result) {
      setDataHistory((draft) => {
        draft.index = result.newIndex;
      });
      setAllAtomicData(result.data);
      setBlockHistoryUpdate(true);
    }
  };
}

/**
 * Check if save operation is possible
 */
export function canSaveMap(mapFile: File | undefined, mapImagesFile: File | undefined): boolean {
  return mapFile !== undefined && mapImagesFile !== undefined;
}

/**
 * Clone and preprocess LevelData for download without mutating the original object.
 */
export function prepareDownloadData(
  data: LevelData,
  globals: GlobalsInterface,
): LevelData {
  let workingData = structuredClone(data);
  ottoPreprocessor((updater) => {
    const next = typeof updater === "function" ? updater(workingData) : updater;
    if (next !== undefined) {
      workingData = next;
    }
  }, globals);
  return workingData;
}
