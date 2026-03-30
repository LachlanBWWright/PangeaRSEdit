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
import { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { sampleTerrainHeightAtPoint } from "@/editor/subviews/water/liquidRenderingUtils";

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
  /** Y value in world units */
  yValue3D: number;
  /** If true, yValue3D is an absolute Y position; if false, it's an offset from terrain height */
  isAbsoluteY: boolean;
}

export interface LiquidPatchCanvas {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
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
const NANOSAUR_LAVA_Y_OFFSET = 50.0;
const NANOSAUR_LAVA_FIXED_Y = 305.0;
const NANOSAUR_WATER_Y_OFFSET = 50.0;
const NANOSAUR_WATER_FIXED_Y = 210.0;

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
 * Default Y offset for Bugdom 1 water when p2 is 0
 */
const BUGDOM_WATER_DEFAULT_Y_OFFSET = 3.0;

/**
 * Default Y offset for Bugdom 1 other liquids when p2 is 0
 */
const BUGDOM_OTHER_LIQUID_DEFAULT_Y_OFFSET = 40.0;
const LIQUID_PATCH_CANVAS_CACHE = new WeakMap<
  TerrainData,
  Map<string, HTMLCanvasElement>
>();
const LIQUID_PATCH_CANVAS_NO_TERRAIN_CACHE = new Map<
  string,
  HTMLCanvasElement
>();

/**
 * Get the dimensions of a liquid patch based on game and item parameters.
 *
 * Bugdom 1: p0 = width in tiles, p1 = depth in tiles (default 4 each)
 *           p2 = Y offset (×4 for water, ×10 for others) or Y table index
 *           p3 bit 2 (water) or bit 0 (others) = use indexed Y mode
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

    // Y calculation
    // WaterPatch (14): p3 bit 2 = indexed Y mode (absolute Y from table)
    //                  otherwise p2 × 4.0 offset (default 3.0 when p2=0)
    // Other liquids: p3 bit 0 = indexed Y mode (absolute Y from table)
    //                otherwise p2 × 10.0 offset (default 40.0 when p2=0)
    let yValue3D = 0;
    let isAbsoluteY = false;

    if (itemType === 14) {
      // WaterPatch
      const indexedYMode = (p3 & (1 << 2)) !== 0;
      if (indexedYMode) {
        // Use Y lookup table - these are ABSOLUTE Y positions
        const yTable = BUGDOM_LIQUID_Y_TABLE[itemType];
        if (yTable) {
          const index = Math.min(p2, yTable.length - 1);
          yValue3D = yTable[index] ?? 0;
          isAbsoluteY = true;
        }
      } else {
        // Y offset from terrain
        let yOff = p2 * 4.0;
        if (yOff === 0) {
          yOff = BUGDOM_WATER_DEFAULT_Y_OFFSET;
        }
        yValue3D = yOff;
        isAbsoluteY = false;
      }
    } else {
      // HoneyPatch, SlimePatch, LavaPatch
      const indexedYMode = (p3 & 1) !== 0;
      if (indexedYMode) {
        // Use Y lookup table - these are ABSOLUTE Y positions
        const yTable = BUGDOM_LIQUID_Y_TABLE[itemType];
        if (yTable) {
          const index = Math.min(p2, yTable.length - 1);
          yValue3D = yTable[index] ?? 0;
          isAbsoluteY = true;
        }
      } else {
        // Y offset from terrain
        let yOff = p2 * 10.0;
        if (yOff === 0) {
          yOff = BUGDOM_OTHER_LIQUID_DEFAULT_Y_OFFSET;
        }
        yValue3D = yOff;
        isAbsoluteY = false;
      }
    }

    return { width2D, depth2D, width3D, depth3D, yValue3D, isAbsoluteY };
  }

  if (globals.GAME_TYPE === Game.NANOSAUR) {
    // Nanosaur 1 - both LavaPatch and WaterPatch use 2.0x default scale
    let scale = 2.0;
    let yValue3D = 0;
    let isAbsoluteY = false;

    if (itemType === 4) {
      // LavaPatch - p3 bit 2 = half-size flag
      // Default is 2.0x scale, bit 2 set = 1.0x scale
      const halfSizeFlag = (p3 & (1 << 2)) !== 0;
      scale = halfSizeFlag ? 1.0 : 2.0;
      const autoY = (p3 & 1) !== 0;
      if (autoY) {
        yValue3D = NANOSAUR_LAVA_Y_OFFSET;
        isAbsoluteY = false;
      } else {
        yValue3D = NANOSAUR_LAVA_FIXED_Y;
        isAbsoluteY = true;
      }
    } else if (itemType === 14) {
      // WaterPatch - p3 bit 0 toggles terrain-relative placement
      const autoY = (p3 & 1) !== 0;
      if (autoY) {
        yValue3D = NANOSAUR_WATER_Y_OFFSET;
        isAbsoluteY = false;
      } else {
        yValue3D = NANOSAUR_WATER_FIXED_Y;
        isAbsoluteY = true;
      }
    }
    // WaterPatch (type 14) always uses 2.0x scale

    // Base size is 4 tiles
    const baseTiles = NANOSAUR_DEFAULT_TILES;
    const width3D = baseTiles * NANOSAUR_TERRAIN_POLYGON_SIZE * scale;
    const depth3D = baseTiles * NANOSAUR_TERRAIN_POLYGON_SIZE * scale;

    // Size in editor coordinates (2D) - divide by scale factor
    const width2D = width3D / coordScale;
    const depth2D = depth3D / coordScale;

    return { width2D, depth2D, width3D, depth3D, yValue3D, isAbsoluteY };
  }

  // Default fallback
  return {
    width2D: 100,
    depth2D: 100,
    width3D: 400,
    depth3D: 400,
    yValue3D: 0,
    isAbsoluteY: false,
  };
}

function drawLiquidPatchCanvas(
  canvas: HTMLCanvasElement,
  style: LiquidPatchStyle,
  globals: GlobalsInterface,
  headerData: HeaderData | null,
  terrainData: TerrainData | null,
  width: number,
  height: number,
  centerX: number,
  centerZ: number,
  liquidSurfaceY: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;

  const cellSize = Math.max(2, Math.round(globals.TILE_SIZE / 8));
  const left = centerX - width / 2;
  const top = centerZ - height / 2;

  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      const sampleX = left + x + cellSize / 2;
      const sampleZ = top + y + cellSize / 2;
      const terrainY =
        headerData && terrainData
          ? sampleTerrainHeightAtPoint(
              sampleX,
              sampleZ,
              headerData,
              terrainData,
              globals,
            )
          : -Infinity;
      if (terrainY > liquidSurfaceY) continue;

      ctx.globalAlpha = 0.9;
      ctx.fillStyle = style.fill2D;
      ctx.fillRect(
        x,
        y,
        Math.min(cellSize, width - x),
        Math.min(cellSize, height - y),
      );
    }
  }

  ctx.globalAlpha = 1;
  ctx.strokeStyle = style.color2D;
  ctx.lineJoin = "miter";
  ctx.lineCap = "square";

  const outerStroke = 3;
  ctx.lineWidth = outerStroke;
  ctx.strokeRect(
    outerStroke / 2,
    outerStroke / 2,
    Math.max(0, width - outerStroke),
    Math.max(0, height - outerStroke),
  );

  const innerWidth = Math.max(0, width * 0.7);
  const innerHeight = Math.max(0, height * 0.7);
  const innerX = (width - innerWidth) / 2;
  const innerY = (height - innerHeight) / 2;
  ctx.lineWidth = 1;
  ctx.strokeRect(innerX, innerY, innerWidth, innerHeight);

  ctx.fillStyle = style.color2D;
  ctx.fillRect(width / 2 - 4, height / 2 - 4, 8, 8);
}

export function getLiquidPatchCanvas(
  globals: GlobalsInterface,
  headerData: HeaderData | null,
  terrainData: TerrainData | null,
  itemType: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  centerX: number,
  centerZ: number,
): LiquidPatchCanvas | null {
  const style = getLiquidPatchStyle(globals, itemType);
  if (!style) return null;

  const dims = getLiquidPatchDimensions(globals, itemType, p0, p1, p2, p3);
  const width = Math.max(1, Math.round(dims.width2D));
  const height = Math.max(1, Math.round(dims.depth2D));
  const liquidSurfaceY = dims.isAbsoluteY
    ? dims.yValue3D
    : headerData && terrainData
      ? sampleTerrainHeightAtPoint(
          centerX,
          centerZ,
          headerData,
          terrainData,
          globals,
        ) + dims.yValue3D
      : dims.yValue3D;

  const cacheKey = [
    globals.GAME_TYPE,
    globals.TILE_SIZE,
    globals.TILE_INGAME_SIZE,
    itemType,
    p0,
    p1,
    p2,
    p3,
    width,
    height,
    Math.round(centerX),
    Math.round(centerZ),
    Math.round(liquidSurfaceY),
  ].join(":");

  const cachedCanvas = terrainData
    ? LIQUID_PATCH_CANVAS_CACHE.get(terrainData)?.get(cacheKey)
    : LIQUID_PATCH_CANVAS_NO_TERRAIN_CACHE.get(cacheKey);
  if (cachedCanvas) {
    return { canvas: cachedCanvas, width, height };
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  drawLiquidPatchCanvas(
    canvas,
    style,
    globals,
    headerData,
    terrainData,
    width,
    height,
    centerX,
    centerZ,
    liquidSurfaceY,
  );
  if (terrainData) {
    let terrainCache = LIQUID_PATCH_CANVAS_CACHE.get(terrainData);
    if (!terrainCache) {
      terrainCache = new Map<string, HTMLCanvasElement>();
      LIQUID_PATCH_CANVAS_CACHE.set(terrainData, terrainCache);
    }
    terrainCache.set(cacheKey, canvas);
  } else {
    LIQUID_PATCH_CANVAS_NO_TERRAIN_CACHE.set(cacheKey, canvas);
  }

  return { canvas, width, height };
}
