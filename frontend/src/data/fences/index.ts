/**
 * Fences Module - Barrel Export
 * 
 * Provides unified access to fence-related functionality including:
 * - Fence type definitions for each game
 * - Fence rendering utilities (color, height, image paths)
 */

// Selection state
export { SelectedFence } from "./fenceAtoms";

// Fence utilities
export { getFenceName } from "./getFenceNames";
export { getFenceTypes } from "./getFenceTypes";
export { getFenceColor } from "./getFenceColor";
export { getFenceHeight } from "./getFenceHeight";
export { getFenceImagePath } from "./getFenceImagePath";

// Game-specific fence types - export with explicit names to avoid conflicts
export { FenceType as OttoFenceType, fenceTypeNames as ottoFenceTypeNames } from "./ottoFenceType";
export { FenceType as BugdomFenceType, fenceTypeNames as bugdomFenceTypeNames } from "./bugdomFenceType";
export { FenceType as Bugdom2FenceType, fenceTypeNames as bugdom2FenceTypeNames } from "./bugdom2FenceType";
export { FenceType as BillyFrontierFenceType, fenceTypeNames as billyFrontierFenceTypeNames } from "./billyFrontierFenceType";
export { FenceType as Nanosaur2FenceType, fenceTypeNames as nanosaur2FenceTypeNames } from "./nanosaur2FenceType";
export { FenceType as CroMagFenceType, fenceTypeNames as croMagFenceTypeNames } from "./croMagFenceType";
