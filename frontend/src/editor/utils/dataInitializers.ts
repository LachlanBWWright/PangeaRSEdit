/**
 * Data structure initializers for creating empty FenceData, LiquidData, and SplineData
 * Used when a level doesn't have these optional data structures
 */

import { FenceData, LiquidData, SplineData } from "@/python/structSpecs/LevelTypes";

/**
 * Create an empty FenceData structure
 * This creates the minimum viable structure for a level with no fences
 */
export function createEmptyFenceData(): FenceData {
  return {
    Fenc: {
      1000: {
        name: "Fence List",
        obj: [],
        order: 0,
      },
    },
    FnNb: {},
  };
}

/**
 * Create an empty LiquidData structure
 * This creates the minimum viable structure for a level with no water bodies
 */
export function createEmptyLiquidData(): LiquidData {
  return {
    Liqd: {
      1000: {
        name: "Water List",
        obj: [],
        order: 0,
      },
    },
  };
}

/**
 * Create an empty SplineData structure
 * This creates the minimum viable structure for a level with no splines
 */
export function createEmptySplineData<TSplineItem = unknown>(): SplineData<TSplineItem> {
  return {
    SpNb: {},
    SpPt: {},
    SpIt: {},
    Spln: {
      1000: {
        name: "Spline List",
        obj: [],
        order: 0,
      },
    },
  };
}
