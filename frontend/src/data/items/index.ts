/**
 * Items Module - Barrel Export
 * 
 * Provides unified access to item-related functionality including:
 * - Item categories and filtering
 * - Item model types and mappings
 * - Standard parameter types
 * - Game-specific mappers
 */

// Item categories and filtering
export {
  ItemCategory,
  categorizeItem,
  getCategoryDisplayName,
  getCategoryColor,
  getAllCategories,
} from "./itemCategories";

// Item filter state and utilities
export {
  FilterMode,
  type ItemFilterState,
  type FilterPreset,
  itemFilterStateAtom,
  savedFiltersAtom,
  isFilterActiveAtom,
  FILTER_PRESETS,
  DEFAULT_FILTER_STATE,
} from "./itemFilterAtoms";

export {
  isItemVisible,
  itemMatchesSearch,
  getVisibleItemTypes,
  countItemsByCategory,
  createDefaultFilter,
  applyFilterPreset,
} from "./itemFilterUtils";

// Item model types and registries
export {
  type UniversalItemModelMapping,
  type GameItemModelMapper,
  type GameModelRegistry,
  type ItemCategory as ModelItemCategory,
  GAME_MODEL_REGISTRIES,
  ITEM_CATEGORY_COLORS,
  getCategoryColor as getModelCategoryColor,
  getModelRegistry,
  gameHasModelSupport,
  getGamesWithModelSupport,
  getFullModelPath,
} from "./itemModelTypes";

// Standard parameter types
export {
  type RotationParam,
  type ScaleParam,
  type TypeSelectorParam,
  type BitFlagsParam,
  type IdParam,
  type CountParam,
  type TimerParam,
  type SpeedParam,
  type CoordinateParam,
  type StandardParamType,
  ROTATION_4_WAY,
  ROTATION_8_WAY,
  ROTATION_16_WAY,
  ROTATION_CONTINUOUS,
  SCALE_ADDITIVE,
  SCALE_DIRECT,
  ENEMY_SPAWN_FLAGS,
  TRIGGER_FLAGS,
  SPLINE_ID,
  ITEM_ID,
  TRIGGER_ID,
  calculateRotation,
  calculateScale,
  getSelectedTypeName,
  isFlagSet,
  getSetFlags,
  timerToSeconds,
  isRotationParam,
  isScaleParam,
  isTypeSelectorParam,
  isBitFlagsParam,
  isIdParam,
  isCountParam,
  isTimerParam,
  isSpeedParam,
  isCoordinateParam,
} from "./standardParamTypes";

// Game-specific mappers
export {
  getGameMapper,
  hasGameMapper,
  getGamesWithMappers,
  getAllMappingCounts,
  getTotalMappedItems,
  getMapperCoverageSummary,
  getMapperCoverageReport,
  OttoItemMapper,
  BugdomItemMapper,
  Bugdom2ItemMapper,
  Nanosaur1ItemMapper,
  Nanosaur2ItemMapper,
  CroMagItemMapper,
  BillyFrontierItemMapper,
} from "./mappers";

// Item model utilities
export {
  getGameMappingSummary,
  validateGameMappings,
  findDuplicateMappings,
  getUniqueModelFiles,
  generateMappingCoverageReport,
  isItemTypeMapped,
  getItemMapping,
} from "./itemModelUtils";
