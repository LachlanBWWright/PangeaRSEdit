/**
 * Game Features Configuration
 *
 * Defines the features available for each game type.
 */

import { Game } from "../../data/globals/globals";
import type { GameFeatures } from "./editorViewTypes";

/**
 * Get feature configuration for a specific game type.
 */
export function getGameFeatures(gameType: Game): GameFeatures {
  switch (gameType) {
    case Game.OTTO_MATIC:
      return {
        supportsFences: true,
        supportsWater: true,
        supportsSplines: true,
        usesIndividualTiles: false,
        hasElectricFloorOptions: true,
        hasCheckpoints: false,
      };

    case Game.BUGDOM:
      return {
        supportsFences: true,
        supportsWater: true,
        supportsSplines: true,
        usesIndividualTiles: true,
        hasElectricFloorOptions: false,
        hasCheckpoints: false,
      };

    case Game.BUGDOM_2:
      return {
        supportsFences: true,
        supportsWater: true,
        supportsSplines: true,
        usesIndividualTiles: false,
        hasElectricFloorOptions: false,
        hasCheckpoints: true,
      };

    case Game.NANOSAUR:
      return {
        supportsFences: false,
        supportsWater: false,
        supportsSplines: false,
        usesIndividualTiles: true,
        hasElectricFloorOptions: false,
        hasCheckpoints: false,
      };

    case Game.NANOSAUR_2:
      return {
        supportsFences: true,
        supportsWater: true,
        supportsSplines: true,
        usesIndividualTiles: false,
        hasElectricFloorOptions: false,
        hasCheckpoints: true,
      };

    case Game.CRO_MAG:
      return {
        supportsFences: true,
        supportsWater: true,
        supportsSplines: true,
        usesIndividualTiles: false,
        hasElectricFloorOptions: false,
        hasCheckpoints: false,
      };

    case Game.BILLY_FRONTIER:
      return {
        supportsFences: true,
        supportsWater: true,
        supportsSplines: true,
        usesIndividualTiles: false,
        hasElectricFloorOptions: false,
        hasCheckpoints: true,
      };

    case Game.MIGHTY_MIKE:
      return {
        supportsFences: false,
        supportsWater: false,
        supportsSplines: false,
        usesIndividualTiles: true,
        hasElectricFloorOptions: false,
        hasCheckpoints: false,
      };

    default:
      // Default to Otto Matic-style features
      return {
        supportsFences: true,
        supportsWater: true,
        supportsSplines: true,
        usesIndividualTiles: false,
        hasElectricFloorOptions: false,
        hasCheckpoints: false,
      };
  }
}

/**
 * Check if the game should show the fence menu tab
 */
export function shouldShowFenceTab(gameType: Game, hasFenceData: boolean): boolean {
  const features = getGameFeatures(gameType);
  return features.supportsFences && hasFenceData;
}

/**
 * Check if the game should show the water menu tab
 */
export function shouldShowWaterTab(gameType: Game, hasLiquidData: boolean): boolean {
  const features = getGameFeatures(gameType);
  return features.supportsWater && hasLiquidData;
}

/**
 * Check if the game should show the splines menu tab
 */
export function shouldShowSplineTab(gameType: Game): boolean {
  const features = getGameFeatures(gameType);
  return features.supportsSplines;
}
