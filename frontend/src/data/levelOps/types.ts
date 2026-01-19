import type { LevelData, SplineData } from "@/python/structSpecs/LevelTypes";

/**
 * Result of a level operation
 */
export interface LevelOpResult<T = void> {
  success: boolean;
  value?: T;
  error?: string;
  /** Changes made for undo tracking */
  changes?: LevelChange[];
}

/**
 * Represents a single atomic change to level data
 */
export interface LevelChange {
  type: "item" | "spline" | "terrain" | "header";
  operation: "add" | "update" | "delete";
  path: string[];
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Dependencies that level operations need (for dependency injection in tests)
 */
export interface LevelOpsDeps {
  /** Get current level data */
  getLevelData: () => LevelData;
  /** Get spline data */
  getSplineData: () => SplineData;
  /** Apply an update to level data */
  updateLevelData: (updater: (draft: LevelData) => void) => void;
  /** Apply an update to spline data */
  updateSplineData: (updater: (draft: SplineData) => void) => void;
}
