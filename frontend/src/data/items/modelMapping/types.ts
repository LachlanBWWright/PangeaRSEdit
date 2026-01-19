/**
 * Unified interface for item-to-3D-model mappings across all games.
 * This provides a consistent structure for looking up how to render
 * game items in the 3D editor view.
 */

/**
 * Parameters extracted from an item for variant selection
 */
export interface ItemVariantParams {
  p0: number;
  p1: number;
  p2: number;
  p3: number;
}

/**
 * Describes how to load and render a 3D model for an item type
 */
export interface ItemModelMapping {
  /** BG3D filename (e.g., "level1_farm.bg3d") */
  modelFile: string;

  /** Subdirectory within game assets */
  modelPath: string;

  /** Model/group index within the BG3D file (0-indexed) */
  modelIndex: number;

  /** For multi-mesh groups, specific mesh indices to use */
  meshIndices?: number[];

  /** True if model requires skeleton data for rigging */
  requiresSkeleton?: boolean;

  /** Skeleton file name (if different from model) */
  skeletonFile?: string;

  /** Scale multiplier for the model (default: 1.0) */
  scale?: number;

  /** Y-axis rotation offset in radians (default: 0) */
  rotationY?: number;

  /** Y-axis position offset (for items that float above terrain) */
  offsetY?: number;

  /** Whether to use transparency (for glass, water effects) */
  transparent?: boolean;

  /** Override color (for team colors, variants) */
  colorOverride?: number;

  /** Parameter-based variant selector function */
  variantSelector?: (params: ItemVariantParams) => number;
}

/**
 * Game-specific model mapping record type
 */
export type GameModelMappings = Record<number, ItemModelMapping | undefined>;
