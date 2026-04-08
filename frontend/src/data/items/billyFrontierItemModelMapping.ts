/**
 * Billy Frontier Item Type to 3D Model Mapping (stub)
 *
 * The active model mappings for Billy Frontier are defined inline in billyFrontierItemMapper.ts.
 * This file is retained for reference only.
 */

import type { UniversalItemModelMapping } from "./itemModelTypes";

/** @deprecated Use UniversalItemModelMapping from itemModelTypes instead */
export type BillyFrontierItemModelMapping = UniversalItemModelMapping;

export const BILLY_FRONTIER_ITEM_MODEL_MAPPINGS: Record<
  number,
  UniversalItemModelMapping | undefined
> = {};

export const getBillyFrontierItemModelMapping = (
  itemType: number,
): UniversalItemModelMapping | undefined => {
  return BILLY_FRONTIER_ITEM_MODEL_MAPPINGS[itemType];
};
