/**
 * Cro-Mag Rally Item Type to 3D Model Mapping (stub)
 *
 * The active model mappings for Cro-Mag Rally are defined inline in croMagItemMapper.ts.
 * This file is retained for reference only.
 */

import type { UniversalItemModelMapping } from "./itemModelTypes";

/** @deprecated Use UniversalItemModelMapping from itemModelTypes instead */
export type CromagItemModelMapping = UniversalItemModelMapping;

export const CROMA_ITEM_MODEL_MAPPINGS: Record<
  number,
  UniversalItemModelMapping | undefined
> = {};

export const getCromagItemModelMapping = (
  itemType: number,
): UniversalItemModelMapping | undefined => {
  return CROMA_ITEM_MODEL_MAPPINGS[itemType];
};
