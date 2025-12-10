/**
 * Otto Matic Level Interface
 *
 * This file defines the complete Otto Matic level data structure.
 * It re-exports types from commonLevelData.ts for use in the interface.
 */

import type {
  HeaderData,
  FenceData,
  SplineData,
  LiquidData,
  ItemData,
  TerrainData,
} from "./ottoMaticLevelData";

// Re-export all individual types from commonLevelData for backward compatibility
export {
  ottoTileAttribute,
  ottoFence,
  ottoFenceNub,
  ottoHeader,
  ottoItem,
  ottoLiquid,
  ottoSupertileGrid,
  ottoSplineItem,
  ottoSplineNub,
  ottoSplinePoint,
  ottoSpline,
  OTTO_LIQD_NUBS,
} from "./ottoMaticLevelData";

export type MakeRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Complete Otto Matic level data structure
 * This is the main interface used throughout the application for level data
 */
export interface ottoMaticLevel
  extends HeaderData,
    Partial<FenceData>,
    Partial<SplineData>,
    Partial<LiquidData>,
    Partial<ItemData>,
    TerrainData {}
