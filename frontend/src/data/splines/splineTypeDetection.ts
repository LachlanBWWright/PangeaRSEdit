/**
 * Spline Type Detection
 *
 * Detects whether splines are circular (closed loops) or open (distinct start/end).
 * Most Pangea games use circular splines, but Billy Frontier has open splines.
 */

import { Game } from "@/data/globals/globals";

/** Threshold for considering two points to be the same position. */
const POSITION_THRESHOLD = 5;

export enum SplineType {
  CIRCULAR = "circular",
  OPEN = "open",
}

interface SplineNubPosition {
  x: number;
  z: number;
}

/** Detects whether a spline is circular by comparing its first and last nubs. */
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

/** Returns true for games that typically use open splines instead of loops. */
export function gameUsesNonCircularSplines(game: Game): boolean {
  return game === Game.BILLY_FRONTIER;
}

/** Returns true when the first spline nub should remain visible. */
export function shouldShowFirstNub(splineType: SplineType): boolean {
  return splineType === SplineType.OPEN;
}

/** Returns true when editing the last nub should also update the first nub. */
export function shouldSyncFirstAndLastNubs(splineType: SplineType): boolean {
  return splineType === SplineType.CIRCULAR;
}
