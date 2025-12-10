/**
 * Otto Matic Level Data Types
 *
 * This file re-exports types from commonLevelData.ts with Otto Matic-specific
 * type specializations for backward compatibility.
 *
 * For game-agnostic code, prefer importing from commonLevelData.ts directly.
 */

import { ItemType } from "../../data/items/ottoItemType";
import { SplineItemType } from "../../data/splines/ottoSplineItemType";

// Re-export all common types for backward compatibility
export {
  // Common types (aliased as otto* for compatibility)
  CommonTileAttribute as ottoTileAttribute,
  CommonFence as ottoFence,
  CommonFenceNub as ottoFenceNub,
  FullHeader as ottoHeader,
  CommonLiquid as ottoLiquid,
  CommonSupertileGrid as ottoSupertileGrid,
  CommonSplineNub as ottoSplineNub,
  CommonSplinePoint as ottoSplinePoint,
  CommonSpline as ottoSpline,
  COMMON_LIQD_NUBS as OTTO_LIQD_NUBS,
  // Data section interfaces
  HeaderData,
  FenceData,
  LiquidData,
  TerrainData,
  LevelMetadata,
  // Type guards
  hasIsEmptyField,
  isSupertileEmpty,
  hasFullHeader,
} from "./commonLevelData";

// Import for re-typing
import type {
  CommonItem,
  CommonSplineItem,
  HeaderData as CommonHeaderData,
  FenceData as CommonFenceData,
  SplineData as CommonSplineData,
  LiquidData as CommonLiquidData,
  ItemData as CommonItemData,
  TerrainData as CommonTerrainData,
} from "./commonLevelData";

// ============================================================================
// OTTO MATIC-SPECIFIC TYPE SPECIALIZATIONS
// ============================================================================

/**
 * Otto Matic item with typed ItemType
 */
export type ottoItem = CommonItem<ItemType>;

/**
 * Otto Matic spline item with typed SplineItemType
 */
export type ottoSplineItem = CommonSplineItem<SplineItemType>;

/**
 * Otto Matic-specific item data
 */
export type ItemData = CommonItemData<ottoItem>;

/**
 * Otto Matic-specific spline data
 */
export type SplineData = CommonSplineData<ottoSplineItem>;

// Re-export other types unchanged for compatibility
export type { CommonHeaderData as HeaderDataBase };
export type { CommonFenceData as FenceDataBase };
export type { CommonSplineData as SplineDataBase };
export type { CommonLiquidData as LiquidDataBase };
export type { CommonItemData as ItemDataBase };
export type { CommonTerrainData as TerrainDataBase };
