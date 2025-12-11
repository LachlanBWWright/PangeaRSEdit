/**
 * Editor View Types
 *
 * Game-specific props types for editor view components.
 * Each game has tailored props that reflect its actual data requirements.
 */

import type { Updater } from "use-immer";
import type {
  HeaderData,
  ItemData,
  LiquidData,
  FenceData,
  SplineData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";

/**
 * Data history for undo/redo functionality
 */
export interface DataHistory {
  items: unknown[];
  index: number;
}

/**
 * Base props shared by all editor views (minimal common interface)
 */
export interface BaseEditorViewProps {
  headerData: HeaderData;
  setHeaderData: Updater<HeaderData>;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  mapImages: HTMLCanvasElement[];
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void;
  undoData: () => void;
  redoData: () => void;
  dataHistory: DataHistory;
}

/**
 * Props for Otto Matic Editor View
 * Supports: items, fences, water, splines, electric floors
 */
export interface OttoMaticEditorViewProps extends BaseEditorViewProps {
  itemData: ItemData;
  setItemData: Updater<ItemData>;
  liquidData: LiquidData;
  setLiquidData: Updater<LiquidData>;
  fenceData: FenceData;
  setFenceData: Updater<FenceData>;
  splineData: SplineData;
  setSplineData: Updater<SplineData>;
}

/**
 * Props for Standard Editor View (Bugdom 2, Nanosaur 2, Cro-Mag, Billy Frontier)
 * Supports: items, fences, water, splines
 */
export interface StandardEditorViewProps extends BaseEditorViewProps {
  itemData: ItemData | null;
  setItemData: Updater<ItemData | null>;
  liquidData: LiquidData | null;
  setLiquidData: Updater<LiquidData | null>;
  fenceData: FenceData | null;
  setFenceData: Updater<FenceData | null>;
  splineData: SplineData | null;
  setSplineData: Updater<SplineData | null>;
}

/**
 * Props for Bugdom Editor View
 * Supports: items, fences, splines (individual tiles)
 */
export interface BugdomEditorViewProps extends BaseEditorViewProps {
  itemData: ItemData | null;
  setItemData: Updater<ItemData | null>;
  fenceData: FenceData | null;
  setFenceData: Updater<FenceData | null>;
  splineData: SplineData | null;
  setSplineData: Updater<SplineData | null>;
}

/**
 * Props for Nanosaur Editor View
 * Supports: items only (no fences, water, or splines)
 */
export interface NanosaurEditorViewProps extends BaseEditorViewProps {
  itemData: ItemData | null;
  setItemData: Updater<ItemData | null>;
}

/**
 * Props for Mighty Mike Editor View
 * Supports: items and terrain only (no fences, water, or splines)
 */
export interface MightyMikeEditorViewProps extends BaseEditorViewProps {
  itemData: ItemData | null;
  setItemData: Updater<ItemData | null>;
}

/**
 * Legacy common props (backwards compatibility - will be removed)
 * @deprecated Use game-specific props types instead
 */
export interface EditorViewProps {
  headerData: HeaderData;
  setHeaderData: Updater<HeaderData>;
  itemData: ItemData | null;
  setItemData: Updater<ItemData | null>;
  liquidData: LiquidData | null;
  setLiquidData: Updater<LiquidData | null>;
  fenceData: FenceData | null;
  setFenceData: Updater<FenceData | null>;
  splineData: SplineData | null;
  setSplineData: Updater<SplineData | null>;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  mapImages: HTMLCanvasElement[];
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void;
  undoData: () => void;
  redoData: () => void;
  dataHistory: DataHistory;
}

/**
 * Feature flags for different game types
 */
export interface GameFeatures {
  /** Whether the game supports fences */
  supportsFences: boolean;
  /** Whether the game supports water/liquid bodies */
  supportsWater: boolean;
  /** Whether the game supports splines */
  supportsSplines: boolean;
  /** Whether the game uses individual tiles (Bugdom 1, Nanosaur 1) */
  usesIndividualTiles: boolean;
  /** Whether the game has electric floor options (Otto Matic only) */
  hasElectricFloorOptions: boolean;
  /** Whether the game has checkpoint data */
  hasCheckpoints: boolean;
}
