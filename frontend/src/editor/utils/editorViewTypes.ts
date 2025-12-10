/**
 * Editor View Types
 *
 * Shared types for all editor view components.
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
 * Common props shared by all editor views
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
