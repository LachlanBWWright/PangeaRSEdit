/**
 * Nanosaur 2 Item Type to 3D Model Mapping (stub)
 *
 * The active model mappings for Nanosaur 2 are defined inline in nanosaur2ItemMapper.ts.
 * This file is retained for reference only.
 */

import type { UniversalItemModelMapping } from "./itemModelTypes";

/** @deprecated Use UniversalItemModelMapping from itemModelTypes instead */
export type Nanosaur2ItemModelMapping = UniversalItemModelMapping;

export const NANOSAUR2_ITEM_MODEL_MAPPINGS: Record<
  number,
  UniversalItemModelMapping | undefined
> = {};

export const getNanosaur2ItemModelMapping = (
  itemType: number,
): UniversalItemModelMapping | undefined => {
  return NANOSAUR2_ITEM_MODEL_MAPPINGS[itemType];
};
