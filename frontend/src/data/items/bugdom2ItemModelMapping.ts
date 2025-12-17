/**
 * Bugdom 2 Item Type to 3D Model Mapping
 *
 * Maps each item type to its corresponding BG3D model file and mesh information.
 * Extracted from Bugdom 2 source code:
 * - /games/bugdom2/Source/Headers/mobjtypes.h
 *
 * Bugdom 2 organizes models into several level-specific and global files:
 * - garden.bg3d (GARDEN level 1)
 * - sidewalk.bg3d (SIDEWALK level 2)
 * - plumbing.bg3d (PLUMBING level 4)
 * - playroom.bg3d (PLAYROOM level 5)
 * - closet.bg3d (CLOSET level 6)
 * - gutter.bg3d (GUTTER level 7)
 * - garbage.bg3d (GARBAGE level 8)
 * - balsa.bg3d (BALSA level 9)
 * - park.bg3d (PARK level 10)
 * - global.bg3d (GLOBAL items)
 * - foliage.bg3d (FOLIAGE items)
 */

import { ItemType } from "./bugdom2ItemType";

/**
 * Describes how to load and render a 3D model for a Bugdom 2 item type
 */
export interface Bugdom2ItemModelMapping {
  /** BG3D filename (e.g., "garden.bg3d", "global.bg3d") */
  modelFile: string;

  /** Subdirectory in /games/bugdom2/ */
  modelPath: "models" | "skeletons";

  /** Model index within the BG3D file (0-indexed, maps to Subgroup_N) */
  modelIndex: number;

  /** True if model requires skeleton data for rigging */
  requiresSkeleton?: boolean;

  /** Skeleton .rsrc filename if applicable */
  skeletonFile?: string;

  /** Scale multiplier for the model (default: 1.0) */
  scale?: number;

  /** Y-axis rotation offset in radians (default: 0) */
  rotationY?: number;
}

/**
 * Comprehensive mapping of all Bugdom 2 item types to their 3D models
 *
 * Enum structure from mobjtypes.h:
 * - GARDEN_ObjType (0-17): GARDEN level objects in garden.bg3d
 * - SIDEWALK_ObjType (0-41): SIDEWALK level objects in sidewalk.bg3d
 * - PLUMBING_ObjType (0-4): PLUMBING level objects in plumbing.bg3d
 * - PLAYROOM_ObjType (0-43): PLAYROOM level objects in playroom.bg3d
 * - CLOSET_ObjType (0-30): CLOSET level objects in closet.bg3d
 * - GUTTER_ObjType (0-5): GUTTER level objects in gutter.bg3d
 * - GARBAGE_ObjType (0-19): GARBAGE level objects in garbage.bg3d
 * - BALSA_ObjType (0-7): BALSA level objects in balsa.bg3d
 * - PARK_ObjType (0-29): PARK level objects in park.bg3d
 * - GLOBAL_ObjType (0-42): Global items in global.bg3d
 * - FOLIAGE_ObjType (0-12): Foliage items in foliage.bg3d
 *
 * Current coverage: 0+/300+ items
 */
export const BUGDOM2_ITEM_MODEL_MAPPINGS: Record<
  number,
  Bugdom2ItemModelMapping | undefined
> = {
  // GARDEN level (garden.bg3d, indices 0-17)
  // TODO: Map GARDEN level items using garden.bg3d

  // SIDEWALK level (sidewalk.bg3d, indices 0-41)
  // TODO: Map SIDEWALK level items using sidewalk.bg3d

  // PLUMBING level (plumbing.bg3d, indices 0-4)
  // TODO: Map PLUMBING level items using plumbing.bg3d

  // PLAYROOM level (playroom.bg3d, indices 0-43)
  // TODO: Map PLAYROOM level items using playroom.bg3d

  // CLOSET level (closet.bg3d, indices 0-30)
  // TODO: Map CLOSET level items using closet.bg3d

  // GUTTER level (gutter.bg3d, indices 0-5)
  // TODO: Map GUTTER level items using gutter.bg3d

  // GARBAGE level (garbage.bg3d, indices 0-19)
  // TODO: Map GARBAGE level items using garbage.bg3d

  // BALSA level (balsa.bg3d, indices 0-7)
  // TODO: Map BALSA level items using balsa.bg3d

  // PARK level (park.bg3d, indices 0-29)
  // TODO: Map PARK level items using park.bg3d

  // GLOBAL items (global.bg3d, indices 0-42)
  // TODO: Map GLOBAL items using global.bg3d

  // FOLIAGE items (foliage.bg3d, indices 0-12)
  // TODO: Map FOLIAGE items using foliage.bg3d
};

/**
 * Get the model mapping for a specific Bugdom 2 item type
 * @param itemType Item type ID
 * @returns Mapping if available, undefined otherwise
 */
export const getBugdom2ItemModelMapping = (
  itemType: number,
): Bugdom2ItemModelMapping | undefined => {
  return BUGDOM2_ITEM_MODEL_MAPPINGS[itemType];
};
