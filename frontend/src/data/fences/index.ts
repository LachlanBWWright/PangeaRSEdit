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
export { getFenceNames, getFenceNameFromType } from "./getFenceNames";
export { getFenceType } from "./getFenceTypes";
export { getFenceColor, getDefaultFenceColor } from "./getFenceColor";
export { getFenceHeight, getDefaultFenceHeight } from "./getFenceHeight";
export { getFenceImagePath } from "./getFenceImagePath";

// Game-specific fence types
export * from "./ottoFenceType";
export * from "./bugdomFenceType";
export * from "./bugdom2FenceType";
export * from "./billyFrontierFenceType";
export * from "./nanosaur2FenceType";
export * from "./croMagFenceType";
