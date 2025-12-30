/**
 * Game-specific Level Data Validation
 *
 * This module provides a centralized validation dispatcher that selects
 * the appropriate Zod schema based on game type.
 */

import { Game } from "../data/globals/globals";
import { Result, ok } from "../types/result";

// Import all game validators
import { validateOttoMaticLevel, LevelDataSchema } from "./games/ottoMatic";
import { validateBugdomLevel, bugdomLevelSchema } from "./games/bugdom";
import { validateBugdom2Level, bugdom2LevelSchema } from "./games/bugdom2";
import { validateNanosaurLevel, nanosaurLevelSchema } from "./games/nanosaur";
import { validateNanosaur2Level, nanosaur2LevelSchema } from "./games/nanosaur2";
import { validateCroMagLevel, croMagLevelSchema } from "./games/croMag";
import { validateBillyFrontierLevel, billyFrontierLevelSchema } from "./games/billyFrontier";

// Re-export individual validators
export {
  validateOttoMaticLevel,
  validateBugdomLevel,
  validateBugdom2Level,
  validateNanosaurLevel,
  validateNanosaur2Level,
  validateCroMagLevel,
  validateBillyFrontierLevel,
};

// Re-export schemas
export {
  LevelDataSchema,
  bugdomLevelSchema,
  bugdom2LevelSchema,
  nanosaurLevelSchema,
  nanosaur2LevelSchema,
  croMagLevelSchema,
  billyFrontierLevelSchema,
};

/**
 * Validation result with the validated data or error
 */
export interface ValidationResult<T> {
  ok: boolean;
  data?: T;
  error?: Error;
  warnings?: string[];
}

/**
 * Validate level data using the appropriate schema for the given game type.
 * Returns a Result with the validated data or an error.
 * The caller can safely cast the result to LevelData after validation succeeds.
 *
 * @param data - The raw level data to validate
 * @param gameType - The game type (from Game enum)
 * @returns Result with validated data or error
 */
export function validateLevelDataForGame(
  data: unknown,
  gameType: Game,
): Result<unknown, Error> {
  switch (gameType) {
    case Game.OTTO_MATIC:
      return validateOttoMaticLevel(data);

    case Game.BUGDOM:
      return validateBugdomLevel(data);

    case Game.BUGDOM_2:
      return validateBugdom2Level(data);

    case Game.NANOSAUR:
      return validateNanosaurLevel(data);

    case Game.NANOSAUR_2:
      return validateNanosaur2Level(data);

    case Game.CRO_MAG:
      return validateCroMagLevel(data);

    case Game.BILLY_FRONTIER:
      return validateBillyFrontierLevel(data);

    case Game.MIGHTY_MIKE:
      // Mighty Mike uses a different format, skip validation for now
      // The parser handles its own validation
      return ok(data);

    default:
      // Unknown game type - try Otto Matic validation as fallback
      // This can happen if a new game is added but validation schema is not yet implemented
      // Action: Add a new case above for the new game type and create its validation schema
      console.warn(
        `Unknown game type ${gameType}, using Otto Matic validation as fallback. ` +
        `To fix: Add validation schema for this game in src/validation/games/`
      );
      return validateOttoMaticLevel(data);
  }
}

/**
 * Get a human-readable name for the game type
 */
export function getGameName(gameType: Game): string {
  switch (gameType) {
    case Game.OTTO_MATIC:
      return "Otto Matic";
    case Game.BUGDOM:
      return "Bugdom";
    case Game.BUGDOM_2:
      return "Bugdom 2";
    case Game.NANOSAUR:
      return "Nanosaur";
    case Game.NANOSAUR_2:
      return "Nanosaur 2";
    case Game.CRO_MAG:
      return "Cro-Mag Rally";
    case Game.BILLY_FRONTIER:
      return "Billy Frontier";
    case Game.MIGHTY_MIKE:
      return "Mighty Mike";
    default:
      return `Unknown (${gameType})`;
  }
}

/**
 * Validates level data with warnings (non-fatal validation issues).
 * This is useful for loading levels that may have minor issues.
 */
export function validateLevelDataWithWarnings(
  data: unknown,
  gameType: Game,
): { result: Result<unknown, Error>; warnings: string[] } {
  const warnings: string[] = [];

  // Perform base validation
  const validationResult = validateLevelDataForGame(data, gameType);

  // If validation failed, check if it's a recoverable error
  if (!validationResult.ok) {
    // Check for common recoverable issues
    const errorMessage = validationResult.error.message;

    // Check if it's just missing optional fields
    if (errorMessage.includes("optional")) {
      warnings.push(`Some optional fields are missing: ${errorMessage}`);
      // Try to continue with partial data
      return { result: ok(data), warnings };
    }
  }

  return { result: validationResult, warnings };
}
