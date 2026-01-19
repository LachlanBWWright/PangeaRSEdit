import { Game } from "@/data/globals/globals";
import type { SplinePoint } from "@/python/structSpecs/LevelTypes";
import { isSplineCircular } from "./splineTypes";

/**
 * Options for rendering a spline based on game and spline data
 */
export interface SplineRenderOptions {
  /** Whether the spline should be treated as circular (closed loop) */
  circular: boolean;
  /** Whether to show distinct start/end endpoint markers */
  showEndpoints: boolean;
}

/**
 * Determine if a spline should be treated as circular based on game and data.
 * 
 * Most Pangea games use circular splines where the first and last nubs
 * are in identical positions. However, Billy Frontier's shootout levels
 * have non-circular splines for enemy paths and camera movement.
 */
export function shouldTreatAsCircular(
  game: Game,
  nubs: SplinePoint[],
): boolean {
  // Billy Frontier special case: shootout level splines may be non-circular
  if (game === Game.BILLY_FRONTIER) {
    // Use a tighter threshold for Billy Frontier since non-circular splines
    // should have clearly distinct endpoints
    if (!isSplineCircular(nubs, 5.0)) {
      return false;
    }
  }

  // Most games: check if first/last nubs match with default threshold
  return isSplineCircular(nubs, 1.0);
}

/**
 * Get spline rendering options based on game and spline data
 */
export function getSplineRenderOptions(
  game: Game,
  nubs: SplinePoint[],
): SplineRenderOptions {
  const circular = shouldTreatAsCircular(game, nubs);

  return {
    circular,
    // Show distinct endpoints for non-circular splines
    showEndpoints: !circular,
  };
}

/**
 * Get a human-readable description of the spline type
 */
export function getSplineTypeDescription(
  circular: boolean,
): string {
  return circular ? "Circular (closed loop)" : "Linear (open path)";
}
