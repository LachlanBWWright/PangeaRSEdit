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

// Game-specific water body types - export with explicit names to avoid conflicts
export { WaterBodyType as OttoWaterBodyType, waterBodyNames as ottoWaterBodyNames } from "./ottoWaterBodyType";
export { WaterBodyType as BugdomWaterBodyType, waterBodyNames as bugdomWaterBodyNames } from "./bugdomWaterBodyType";
export { WaterBodyType as Bugdom2WaterBodyType, waterBodyNames as bugdom2WaterBodyNames } from "./bugdom2WaterBodyType";
export { WaterBodyType as BillyFrontierWaterBodyType, waterBodyNames as billyFrontierWaterBodyNames } from "./billyFrontierWaterBodyType";
export { WaterBodyType as Nanosaur2WaterBodyType, waterBodyNames as nanosaur2WaterBodyNames } from "./nanosaur2WaterBodyType";
export { WaterBodyType as CroMagWaterBodyType, waterBodyNames as croMagWaterBodyNames } from "./croMagWaterBodyType";
