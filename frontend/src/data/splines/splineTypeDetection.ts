/**
 * Spline Type Detection
 * 
 * Detects whether splines are circular (closed loops) or open (distinct start/end).
 * Most Pangea games use circular splines, but Billy Frontier has open splines.
 */

import { Game } from "@/data/globals/globals";

/**
 * Threshold for considering two points "the same" position.
 * Small tolerance for floating point/rounding differences.
 */
const POSITION_THRESHOLD = 5;

export enum SplineType {
  CIRCULAR = "circular",
  OPEN = "open",
}

interface SplineNubPosition {
  x: number;
  z: number;
}

/**
 * Detect if a spline is circular based on first/last nub positions.
 * Circular splines have their first and last nub at the same position.
 */
export function detectSplineType(nubs: SplineNubPosition[]): SplineType {
  if (nubs.length < 2) return SplineType.OPEN;

  const firstNub = nubs[0];
  const lastNub = nubs[nubs.length - 1];

  if (!firstNub || !lastNub) return SplineType.OPEN;

  const dx = Math.abs(firstNub.x - lastNub.x);
  const dz = Math.abs(firstNub.z - lastNub.z);

  if (dx < POSITION_THRESHOLD && dz < POSITION_THRESHOLD) {
    return SplineType.CIRCULAR;
  }

  return SplineType.OPEN;
}

/**
 * Check if a game typically uses non-circular splines.
 * Billy Frontier is the primary case with open splines for camera paths,
 * walker patrols, and stampede lanes.
 */
export function gameUsesNonCircularSplines(game: Game): boolean {
  return game === Game.BILLY_FRONTIER;
}

/**
 * Get effective spline type considering game defaults and actual nub positions.
 */
export function getEffectiveSplineType(
  nubs: SplineNubPosition[],
): SplineType {
  return detectSplineType(nubs);
}

/**
 * Check if the first nub should be visible based on spline type.
 * For circular splines, the first nub is hidden (merged with last).
 * For open splines, both endpoints should be visible.
 */
export function shouldShowFirstNub(splineType: SplineType): boolean {
  return splineType === SplineType.OPEN;
}

/**
 * Check if moving the last nub should also move the first nub.
 * Only applies to circular splines where first/last are merged.
 */
export function shouldSyncFirstAndLastNubs(splineType: SplineType): boolean {
  return splineType === SplineType.CIRCULAR;
}
