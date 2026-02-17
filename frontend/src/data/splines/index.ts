/**
 * Splines Module - Barrel Export
 * 
 * Provides unified access to spline-related functionality including:
 * - Spline type detection (circular vs open)
 * - Spline item types for each game
 */

// Spline type detection
export {
  SplineType,
  detectSplineType,
  gameUsesNonCircularSplines,
  shouldShowFirstNub,
  shouldSyncFirstAndLastNubs,
} from "./splineTypeDetection";

// Spline selection state
export { SelectedSpline } from "./splineAtoms";

// Spline item type utilities
export { getSplineItemName } from "./getSplineItemNames";
export { getSplineItemTypes } from "./getSplineItemTypes";

// Game-specific spline item types - export with explicit names to avoid conflicts
export { SplineItemType as OttoSplineItemType, splineItemTypeNames as ottoSplineItemTypeNames } from "./ottoSplineItemType";
export { SplineItemType as BugdomSplineItemType, splineItemTypeNames as bugdomSplineItemTypeNames } from "./bugdomSplineItemType";
export { SplineItemType as Bugdom2SplineItemType, splineItemTypeNames as bugdom2SplineItemTypeNames } from "./bugdom2SplineItemType";
export { SplineItemType as BillyFrontierSplineItemType, splineItemTypeNames as billyFrontierSplineItemTypeNames } from "./billyFrontierSplineItemType";
export { SplineItemType as Nanosaur2SplineItemType, splineItemTypeNames as nanosaur2SplineItemTypeNames } from "./nanosaur2SplineItemType";
export { SplineItemType as CroMagSplineItemType, splineItemTypeNames as croMagSplineItemTypeNames } from "./croMagSplineItemType";
