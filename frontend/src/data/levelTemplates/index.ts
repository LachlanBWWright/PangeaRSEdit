/**
 * Level Templates Module
 * 
 * Exports level requirements and blank level generation utilities.
 */

export {
  type LevelRequirements,
  LEVEL_REQUIREMENTS,
  getLevelRequirements,
  validateDimensions,
  getDefaultDimensions,
} from "./levelRequirements";

export {
  type BlankLevelOptions,
  type BlankLevelData,
  createBlankLevel,
  canCreateBlankLevel,
  getBlankLevelDescription,
} from "./blankLevelGenerator";
