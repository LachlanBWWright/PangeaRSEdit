import { SplineNub } from "@/python/structSpecs/LevelTypes";
import { Game } from "@/data/globals/globals";

/**
 * Threshold for considering two points "the same" position
 * Small tolerance for floating point/rounding differences
 */
const POSITION_THRESHOLD = 5; // World units

export enum SplineType {
  CIRCULAR = "circular",       // First and last nub at same position
  OPEN = "open",              // First and last nub at different positions
}

/**
 * Detect if a spline is circular based on first/last nub positions
 */
export function detectSplineType(nubs: SplineNub[]): SplineType {
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
