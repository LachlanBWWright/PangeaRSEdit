/**
 * Editor View Utilities
 *
 * Pure functions extracted from EditorView to avoid closures within React components.
 * These functions are parameterized to receive all required data as arguments.
 */

import { Updater } from "use-immer";
import { Draft } from "immer";
import type { ItemData, LiquidData, FenceData, SplineData } from "@/python/structSpecs/LevelTypes";

/**
 * Creates an Updater wrapper that only applies updates when data is non-null.
 * This is useful for menus that expect non-null data.
 */
export function createNonNullUpdater<T>(
  setter: Updater<T | null>
): Updater<T> {
  return (updater) => {
    setter((current) => {
      if (!current) return current;
      if (typeof updater === "function") {
        // Apply the update function to current draft
        // The function returns void in immer - the mutation is in-place
        updater(current as Draft<T>);
        return current;
      }
      return updater;
    });
  };
}

/**
 * Creates keyboard event handler for undo/redo functionality.
 * 
 * @param undoData - Function to call for undo action
 * @param redoData - Function to call for redo action
 * @returns Event handler function for keydown events
 */
export function createUndoRedoKeyHandler(
  undoData: () => void,
  redoData: () => void
): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      !e.shiftKey &&
      (e.key === "z" || e.key === "Z")
    ) {
      e.preventDefault();
      undoData();
    } else if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === "y" || (e.shiftKey && (e.key === "z" || e.key === "Z")))
    ) {
      e.preventDefault();
      redoData();
    }
  };
}

/**
 * Stage state interface for Konva view
 */
export interface StageState {
  scale: number;
  x: number;
  y: number;
}

/**
 * Creates a zoom in handler that increases scale by 10%
 */
export function createZoomInHandler(setStage: Updater<StageState>): () => void {
  return () => {
    setStage((stage) => {
      stage.scale = Math.max(0.1, stage.scale * 1.1);
    });
  };
}

/**
 * Creates a zoom out handler that decreases scale by 10%
 */
export function createZoomOutHandler(setStage: Updater<StageState>): () => void {
  return () => {
    setStage((stage) => {
      stage.scale = Math.min(5, stage.scale * 0.9);
    });
  };
}

/**
 * Check if terrain has supertile grid data (STgd) or layer data (Layr)
 * This determines whether the supertiles view is available.
 */
export function terrainHasSupertileData(terrainData: {
  STgd?: { 1000?: unknown } | null;
  Layr?: { 1000?: unknown } | null;
} | null): boolean {
  if (!terrainData) return false;
  return (
    (terrainData.STgd !== undefined && terrainData.STgd !== null) ||
    (terrainData.Layr !== undefined && terrainData.Layr !== null)
  );
}

// Re-export types for convenience
export type { ItemData, LiquidData, FenceData, SplineData };
