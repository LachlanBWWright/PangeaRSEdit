/**
 * Utility for identifying and styling liquid patch items in Bugdom 1 and Nanosaur 1.
 * These games use items to represent water bodies instead of dedicated Liqd resources.
 *
 * Size handling:
 * - Bugdom 1: p0 = width in tiles, p1 = depth in tiles (default 4 each)
 *   Size = tiles × TERRAIN_POLYGON_SIZE (160 world units)
 * - Nanosaur 1 LavaPatch: p3 bit 2 = half-size flag (default 2.0x, half when set)
 */

import { Game, GlobalsInterface } from "../globals/globals";

/**
 * Types of liquid patches that can appear as items
 */
export type LiquidPatchType = "water" | "honey" | "slime" | "lava";

/**
 * Visual properties for liquid patch rendering
 */
export interface LiquidPatchStyle {
  type: LiquidPatchType;
  /** Hex color for 2D rendering (e.g., "#0066FFAA") */
  color2D: string;
  /** Fill color for 2D rendering */
  fill2D: string;
  /** Hex color for 3D rendering (e.g., 0x0066ff) */
  color3D: number;
  /** Opacity for 3D rendering (0-1) */
  opacity3D: number;
  /** Display name for the liquid type */
  name: string;
}

/**
 * Calculated dimensions for a liquid patch
 */
export interface LiquidPatchDimensions {
  /** Width in editor coordinates (2D view) */
  width2D: number;
  /** Depth in editor coordinates (2D view) */
  depth2D: number;
  /** Width in world units (3D view) */
  width3D: number;
  /** Depth in world units (3D view) */
  depth3D: number;
  /** Y offset in world units (added to terrain height) */
  yOffset3D: number;
}

/**
 * Bugdom 1 liquid patch item types
 */
export const BUGDOM_LIQUID_ITEMS: Record<number, LiquidPatchStyle> = {
  14: {
    // WaterPatch
    type: "water",
    color2D: "#0088FFCC",
    fill2D: "#0088FF66",
    color3D: 0x0088ff,
    opacity3D: 0.6,
    name: "Water Patch",
  },
  27: {
    // HoneyPatch
    type: "honey",
    color2D: "#FFB300CC",
    fill2D: "#FFB30066",
    color3D: 0xffb300,
    opacity3D: 0.7,
    name: "Honey Patch",
  },
  55: {
    // SlimePatch
    type: "slime",
    color2D: "#44CC44CC",
    fill2D: "#44CC4466",
    color3D: 0x44cc44,
    opacity3D: 0.7,
    name: "Slime Patch",
  },
  56: {
    // LavaPatch
    type: "lava",
    color2D: "#FF4400CC",
    fill2D: "#FF440088",
    color3D: 0xff4400,
    opacity3D: 0.85,
    name: "Lava Patch",
  },
};

/**
 * Nanosaur 1 liquid patch item types
 */
export const NANOSAUR_LIQUID_ITEMS: Record<number, LiquidPatchStyle> = {
  4: {
    // LavaPatch
    type: "lava",
    color2D: "#FF4400CC",
    fill2D: "#FF440088",
    color3D: 0xff4400,
    opacity3D: 0.85,
    name: "Lava Patch",
  },
  14: {
    // WaterPatch
    type: "water",
    color2D: "#0088FFCC",
    fill2D: "#0088FF66",
    color3D: 0x0088ff,
    opacity3D: 0.6,
    name: "Water Patch",
  },
};

/**
 * Get the liquid patch style for an item type in a specific game.
 * Returns null if the item is not a liquid patch.
 */
export function getLiquidPatchStyle(
  globals: GlobalsInterface,
  itemType: number
): LiquidPatchStyle | null {
  switch (globals.GAME_TYPE) {
    case Game.BUGDOM:
      return BUGDOM_LIQUID_ITEMS[itemType] ?? null;
    case Game.NANOSAUR:
      return NANOSAUR_LIQUID_ITEMS[itemType] ?? null;
    default:
      return null;
  }
}

/**
 * Check if an item type is a liquid patch in the current game
 */
export function isLiquidPatchItem(
  globals: GlobalsInterface,
  itemType: number
): boolean {
  return getLiquidPatchStyle(globals, itemType) !== null;
}

/**
 * Bugdom 1 terrain polygon size (world units per tile)
 */
const BUGDOM_TERRAIN_POLYGON_SIZE = 160;

/**
 * Nanosaur 1 terrain polygon size (world units per tile)
 */
const NANOSAUR_TERRAIN_POLYGON_SIZE = 140;

/**
 * Default tile count for Bugdom 1 liquid patches when p0/p1 are 0
 */
const BUGDOM_DEFAULT_TILES = 4;

/**
 * Default tile count for Nanosaur 1 liquid patches
 */
const NANOSAUR_DEFAULT_TILES = 4;

/**
 * Bugdom 1 liquid Y position lookup table.
 * Used when indexed Y mode is enabled (p3 bit 2 for water, p3 bit 0 for others).
 * p2 is the index into the table for the corresponding liquid type.
 * Source: games/bugdom/src/Items/Liquids.c lines 53-59
 */
const BUGDOM_LIQUID_Y_TABLE: Record<number, number[]> = {
  14: [900, 950, 0, 0, 0, 0],       // LIQUID_WATER (WaterPatch)
  27: [-620, -580, -550, -600, 0, 0], // LIQUID_HONEY (HoneyPatch)
  55: [0, -200, 0, 0, 0, 0],        // LIQUID_SLIME (SlimePatch)
  56: [-230, -230, -230, 0, 0, 0],  // LIQUID_LAVA (LavaPatch)
};

/**
 * Get the dimensions of a liquid patch based on game and item parameters.
 *
 * Bugdom 1: p0 = width in tiles, p1 = depth in tiles (default 4 each)
 *           p2 = Y offset (×4 for water, ×10 for others)
 * Nanosaur 1 LavaPatch (type 4): p3 bit 2 = half-size (default 2.0x scale)
 * Nanosaur 1 WaterPatch (type 14): fixed 2.0x scale
 */
export function getLiquidPatchDimensions(
  globals: GlobalsInterface,
  itemType: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number
): LiquidPatchDimensions {
  // Calculate the coordinate scale factor
  const coordScale = globals.TILE_INGAME_SIZE / globals.TILE_SIZE;

  if (globals.GAME_TYPE === Game.BUGDOM) {
    // Bugdom 1: p0 = width in tiles, p1 = depth in tiles
    const widthTiles = p0 === 0 ? BUGDOM_DEFAULT_TILES : p0;
    const depthTiles = p1 === 0 ? BUGDOM_DEFAULT_TILES : p1;

    // Size in world units (3D)
    const width3D = widthTiles * BUGDOM_TERRAIN_POLYGON_SIZE;
    const depth3D = depthTiles * BUGDOM_TERRAIN_POLYGON_SIZE;

    // Size in editor coordinates (2D) - divide by scale factor
    const width2D = width3D / coordScale;
    const depth2D = depth3D / coordScale;

    // Y offset calculation
    // WaterPatch (14): p2 × 4.0 (unless p3 bit 2 = indexed Y mode, then use Y table)
    // Other liquids: p2 × 10.0 (unless p3 bit 0 = indexed Y mode, then use Y table)
    let yOffset3D = 0;
    if (itemType === 14) {
      // WaterPatch
      const indexedYMode = (p3 & (1 << 2)) !== 0;
      if (indexedYMode) {
        // Use Y lookup table
        const yTable = BUGDOM_LIQUID_Y_TABLE[itemType];
        if (yTable) {
          const index = Math.min(p2, yTable.length - 1);
          yOffset3D = yTable[index] ?? 0;
        }
      } else {
        yOffset3D = p2 * 4.0;
      }
    } else {
      // HoneyPatch, SlimePatch, LavaPatch
      const indexedYMode = (p3 & 1) !== 0;
      if (indexedYMode) {
        // Use Y lookup table
        const yTable = BUGDOM_LIQUID_Y_TABLE[itemType];
        if (yTable) {
          const index = Math.min(p2, yTable.length - 1);
          yOffset3D = yTable[index] ?? 0;
        }
      } else {
        yOffset3D = p2 * 10.0;
      }
    }

    return { width2D, depth2D, width3D, depth3D, yOffset3D };
  }

  if (globals.GAME_TYPE === Game.NANOSAUR) {
    // Nanosaur 1 - both LavaPatch and WaterPatch use 2.0x default scale
    let scale = 2.0;

    if (itemType === 4) {
      // LavaPatch - p3 bit 2 = half-size flag
      // Default is 2.0x scale, bit 2 set = 1.0x scale
      const halfSizeFlag = (p3 & (1 << 2)) !== 0;
      scale = halfSizeFlag ? 1.0 : 2.0;
    }
    // WaterPatch (type 14) always uses 2.0x scale

    // Base size is 4 tiles
    const baseTiles = NANOSAUR_DEFAULT_TILES;
    const width3D = baseTiles * NANOSAUR_TERRAIN_POLYGON_SIZE * scale;
    const depth3D = baseTiles * NANOSAUR_TERRAIN_POLYGON_SIZE * scale;

    // Size in editor coordinates (2D) - divide by scale factor
    const width2D = width3D / coordScale;
    const depth2D = depth3D / coordScale;

    // Nanosaur Y offset - not implemented, would need source code analysis
    const yOffset3D = 0;

    return { width2D, depth2D, width3D, depth3D, yOffset3D };
  }

  // Default fallback
  return {
    width2D: 100,
    depth2D: 100,
    width3D: 400,
    depth3D: 400,
    yOffset3D: 0,
  };
}
