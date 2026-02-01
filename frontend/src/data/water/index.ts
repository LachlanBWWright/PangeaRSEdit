/**
 * Water Module - Barrel Export
 * 
 * Provides unified access to water body functionality including:
 * - Water body type definitions for each game
 * - Water body rendering utilities
 */

// Selection state
export { SelectedWaterBody } from "./waterAtoms";

// Water body utilities
export { getWaterBodyTypes } from "./getWaterBodyTypes";
export { getWaterBodyTypeName } from "./getWaterBodyTypeName";

// Game-specific water body types
export * from "./ottoWaterBodyType";
export * from "./bugdomWaterBodyType";
export * from "./bugdom2WaterBodyType";
export * from "./billyFrontierWaterBodyType";
export * from "./nanosaur2WaterBodyType";
export * from "./croMagWaterBodyType";
