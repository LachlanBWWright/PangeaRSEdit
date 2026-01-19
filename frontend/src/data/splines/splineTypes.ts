import type { SplinePoint } from "@/python/structSpecs/LevelTypes";

/**
 * Metadata about a spline's circular/non-circular nature
 */
export interface SplineCircularInfo {
  /** True if the spline forms a closed loop */
  isCircular: boolean;
  /** Distance between first and last nubs */
  endpointDistance: number;
}

/**
 * Check if a spline is circular based on first/last nub positions
 */
export function isSplineCircular(
  nubs: SplinePoint[],
  threshold = 1.0,
): boolean {
  if (nubs.length < 2) return false;

  const first = nubs[0];
  const last = nubs[nubs.length - 1];

  if (!first || !last) return false;

  const dx = Math.abs(first.x - last.x);
  const dz = Math.abs(first.z - last.z);

  return dx <= threshold && dz <= threshold;
}

/**
 * Get detailed info about spline circularity
 */
export function getSplineCircularInfo(
  nubs: SplinePoint[],
  threshold = 1.0,
): SplineCircularInfo {
  if (nubs.length < 2) {
    return { isCircular: false, endpointDistance: 0 };
  }

  const first = nubs[0];
  const last = nubs[nubs.length - 1];

  if (!first || !last) {
    return { isCircular: false, endpointDistance: 0 };
  }

  const dx = first.x - last.x;
  const dz = first.z - last.z;
  const distance = Math.sqrt(dx * dx + dz * dz);

  return {
    isCircular: distance <= threshold,
    endpointDistance: distance,
  };
}
