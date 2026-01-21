import { StandardParamType } from "./standardParamTypes";

/**
 * Universal model mapping that works across all games
 */
export interface UniversalItemModelMapping {
  /** BG3D filename */
  modelFile: string;

  /** Path type */
  modelPath: "models" | "skeletons";

  /** Model index within the BG3D file (maps to Subgroup_N) */
  modelIndex: number;

  /** Alternative models for variants (indexed by p0 value) */
  variants?: Record<number, {
    modelFile?: string;  // Optional different file
    modelIndex: number;  // Different subgroup
  }>;

  /** True if model requires skeleton data */
  requiresSkeleton?: boolean;

  /** Skeleton file */
  skeletonFile?: string;

  /** Base scale multiplier */
  scale?: number;

  /** Rotation offset (radians) */
  rotationY?: number;

  /** Which parameter controls rotation (uses StandardParamType) */
  rotationParam?: {
    paramIndex: 0 | 1 | 2 | 3;
    rotationType: StandardParamType;
  };

  /** Which parameter controls scale */
  scaleParam?: {
    paramIndex: 0 | 1 | 2 | 3;
    multiplier: number;
    offset: number;
  };

  /** Level restriction (0 = all levels, -1 = not available) */
  levelRestriction?: number;
}

/**
 * Game-specific model mapper interface
 */
export interface GameItemModelMapper {
  /**
   * Get model mapping for an item type
   * @param itemType Item type ID
   * @param levelNum Current level number (for level-specific models)
   * @param params Item parameters (for variant selection)
   */
  getMapping(
    itemType: number,
    levelNum?: number,
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined;

  /**
   * Get all mapped item types
   */
  getMappedTypes(): number[];

  /**
   * Check if an item type has a model
   */
  hasModel(itemType: number): boolean;
}

// Re-export type aliases for game-specific mappings to maintain compatibility
export type CromagItemModelMapping = UniversalItemModelMapping;
export type BillyFrontierItemModelMapping = UniversalItemModelMapping;
