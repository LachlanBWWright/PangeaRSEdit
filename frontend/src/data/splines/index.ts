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
export { getSplineItemNames } from "./getSplineItemNames";
export { getSplineItemType } from "./getSplineItemTypes";

// Game-specific spline item types
export * from "./ottoSplineItemType";
export * from "./bugdomSplineItemType";
export * from "./bugdom2SplineItemType";
export * from "./billyFrontierSplineItemType";
export * from "./nanosaur2SplineItemType";
export * from "./croMagSplineItemType";
