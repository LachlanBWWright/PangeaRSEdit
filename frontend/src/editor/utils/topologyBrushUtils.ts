import {
  TopologyBrushMode,
  TopologyValueMode,
  TopologyEditTarget,
  ConstraintMode
} from "@/data/tiles/tileAtoms";
import type { GlobalsInterface } from "@/data/globals/globals";
import { StandardHeader } from "@/python/structSpecs/LevelTypes";

// Minimum vertical distance between roof and floor (in game units)
// Ensures roof is always above floor with reasonable separation
export const MIN_ROOF_FLOOR_DISTANCE = 10;

export interface PixelType {
  x: number;
  y: number;
  value: number;
  distance: number;
}

export interface BrushParams {
  centerX: number;
  centerY: number;
  radius: number;
  brushMode: TopologyBrushMode;
  valueMode: TopologyValueMode;
  value: number;
  header: StandardHeader;
  globals: GlobalsInterface;
  tileSize: number; // For 2D use globals.TILE_SIZE, for 3D use 1 (tile units)
}

/**
 * Calculate which tiles/pixels should be affected by the brush
 */
export function calculateBrushPixels(params: BrushParams): PixelType[] {
  const { centerX, centerY, radius, brushMode, value, tileSize } = params;
  const pixelList: PixelType[] = [];

  if (brushMode === TopologyBrushMode.CIRCLE_BRUSH) {
    // Create a circular brush pattern
    const baseX = centerX - radius;
    const baseY = centerY - radius;
    const diameter = radius * 2;

    for (let i = 0; i <= diameter; i += tileSize) {
      for (let j = 0; j <= diameter; j += tileSize) {
        const tileX = baseX + i;
        const tileY = baseY + j;

        // Calculate if this tile is within the circle radius
        const distanceSquared =
          Math.pow(tileX - centerX, 2) + Math.pow(tileY - centerY, 2);

        const distance = Math.sqrt(distanceSquared) / radius;

        if (distanceSquared <= Math.pow(radius, 2)) {
          pixelList.push({
            x: tileX,
            y: tileY,
            value: value,
            distance: distance,
          });
        }
      }
    }
  } else {
    // Square brush pattern
    const baseX = centerX - radius;
    const baseY = centerY - radius;
    const size = radius * 2;

    // Calculate distance for square brush (normalized from 0 to 1)
    // Using Manhattan distance for square pattern feel
    for (let i = 0; i <= size; i += tileSize) {
      for (let j = 0; j <= size; j += tileSize) {
        const tileX = baseX + i;
        const tileY = baseY + j;

        // Calculate distance from center (using max of x,y distance for square pattern feel)
        const xDistance = Math.abs(tileX - centerX);
        const yDistance = Math.abs(tileY - centerY);
        const distance = Math.max(xDistance, yDistance) / radius;

        pixelList.push({
          x: tileX,
          y: tileY,
          value: value,
          distance: distance,
        });
      }
    }
  }

  return pixelList;
}

/**
 * Apply brush modifications to the terrain height array
 */
export function applyTopologyBrush(
  ycrdArray: Int16Array | number[],
  pixels: PixelType[],
  params: BrushParams
): void {
  const { valueMode, header } = params;
  const mapWidth = header.mapWidth;
  const mapHeight = header.mapHeight;

  pixels.forEach((pixel) => {
    // Convert pixel coordinates to tile coordinates
    const xTile = Math.floor(pixel.x / params.tileSize);
    const yTile = Math.floor(pixel.y / params.tileSize);

    // Boundary check
    if (xTile < 0 || xTile >= mapWidth || yTile < 0 || yTile >= mapHeight) {
      return;
    }

    // Flatten coordinate to array index
    const index = yTile * (mapWidth + 1) + xTile;
    if (index < 0 || index >= ycrdArray.length) return;

    const currentValue = ycrdArray[index];
    if (currentValue === undefined) return;

    let newValue: number;
    switch (valueMode) {
      case TopologyValueMode.SET_VALUE:
        newValue = pixel.value;
        break;

      case TopologyValueMode.DELTA_VALUE:
        newValue = currentValue + pixel.value;
        break;

      case TopologyValueMode.DELTA_WITH_DROPOFF: {
        // Apply falloff: full effect at center (distance=0), no effect at edge (distance=1)
        const falloff = 1 - pixel.distance;
        newValue = currentValue + pixel.value * falloff;
        break;
      }

      default:
        newValue = currentValue;
    }

    // Clamp to Int16 range
    ycrdArray[index] = Math.max(
      -32768,
      Math.min(32767, Math.round(newValue))
    );
  });
}

/**
 * Helper to clamp values to Int16 range
 */
function clampInt16(val: number): number {
  return Math.max(-32768, Math.min(32767, Math.round(val)));
}

/**
 * Apply symmetric floor/roof editing
 */
export function applySymmetricTopologyBrush(
  floorArray: Int16Array | number[],
  roofArray: Int16Array | number[],
  pixels: PixelType[],
  params: BrushParams,
  centerElevation: number,
  maintainSymmetry: boolean = true
): { hasViolation: boolean } {
  const { valueMode, header } = params;
  const mapWidth = header.mapWidth;
  const mapHeight = header.mapHeight;
  let hasViolation = false;

  pixels.forEach((pixel) => {
    // Convert pixel coordinates to tile coordinates
    const xTile = Math.floor(pixel.x / params.tileSize);
    const yTile = Math.floor(pixel.y / params.tileSize);

    // Boundary check
    if (xTile < 0 || xTile >= mapWidth || yTile < 0 || yTile >= mapHeight) {
      return;
    }

    // Flatten coordinate to array index
    const index = yTile * (mapWidth + 1) + xTile;
    if (index < 0 || index >= floorArray.length || index >= roofArray.length) return;

    const currentFloor = floorArray[index];
    const currentRoof = roofArray[index];
    if (currentFloor === undefined || currentRoof === undefined) return;

    const currentCenter = (currentFloor + currentRoof) / 2;
    const currentDistance = (currentRoof - currentFloor) / 2;

    let newCenter: number;
    switch (valueMode) {
      case TopologyValueMode.SET_VALUE:
        newCenter = pixel.value;
        break;
      case TopologyValueMode.DELTA_VALUE:
        newCenter = currentCenter + pixel.value;
        break;
      case TopologyValueMode.DELTA_WITH_DROPOFF:
        const falloff = 1 - pixel.distance;
        newCenter = currentCenter + pixel.value * falloff;
        break;
      default:
        newCenter = currentCenter;
    }

    if (maintainSymmetry) {
      // Keep same distance from center
      floorArray[index] = clampInt16(newCenter - currentDistance);
      roofArray[index] = clampInt16(newCenter + currentDistance);
    } else {
      const floorDist = centerElevation - currentFloor;
      const roofDist = currentRoof - centerElevation;
      floorArray[index] = clampInt16(newCenter - floorDist);
      roofArray[index] = clampInt16(newCenter + roofDist);
    }

    // Enforce minimum distance
    if (roofArray[index] - floorArray[index] < MIN_ROOF_FLOOR_DISTANCE) {
      hasViolation = true;
      const mid = (floorArray[index] + roofArray[index]) / 2;
      floorArray[index] = clampInt16(mid - MIN_ROOF_FLOOR_DISTANCE / 2);
      roofArray[index] = clampInt16(mid + MIN_ROOF_FLOOR_DISTANCE / 2);
    }
  });

  return { hasViolation };
}

/**
 * Apply brush with target support and constraints
 */
export function applyTopologyBrushWithTarget(
  floorArray: Int16Array | number[],
  roofArray: Int16Array | number[] | undefined,
  pixels: PixelType[],
  params: BrushParams,
  target: TopologyEditTarget,
  constraintMode: ConstraintMode,
  centerElevation?: number,
  maintainSymmetry: boolean = true
): { hasViolation: boolean } {
  const mapWidth = params.header.mapWidth;
  const mapHeight = params.header.mapHeight;
  let hasViolation = false;

  if (target === TopologyEditTarget.BOTH && roofArray) {
    return applySymmetricTopologyBrush(floorArray, roofArray, pixels, params, centerElevation ?? 0, maintainSymmetry);
  }

  // Single target editing
  if (target === TopologyEditTarget.FLOOR) {
    applyTopologyBrush(floorArray, pixels, params);

    // Check constraints if roof exists
    if (roofArray) {
       pixels.forEach(pixel => {
         const xTile = Math.floor(pixel.x / params.tileSize);
         const yTile = Math.floor(pixel.y / params.tileSize);

         if (xTile < 0 || xTile >= mapWidth || yTile < 0 || yTile >= mapHeight) return;

         const idx = yTile * (mapWidth + 1) + xTile;
         if (idx >= 0 && idx < floorArray.length) {
            const floor = floorArray[idx];
            const roof = roofArray[idx];

            if (floor !== undefined && roof !== undefined && floor + MIN_ROOF_FLOOR_DISTANCE > roof) {
               hasViolation = true;
               if (constraintMode === ConstraintMode.PUSH_ROOF) {
                 roofArray[idx] = clampInt16(floor + MIN_ROOF_FLOOR_DISTANCE);
               } else if (constraintMode === ConstraintMode.PUSH_FLOOR) {
                  floorArray[idx] = clampInt16(roof - MIN_ROOF_FLOOR_DISTANCE);
               } else if (constraintMode === ConstraintMode.BLOCK) {
                  floorArray[idx] = clampInt16(roof - MIN_ROOF_FLOOR_DISTANCE);
               }
            }
         }
       });
    }
  } else if (target === TopologyEditTarget.ROOF && roofArray) {
    applyTopologyBrush(roofArray, pixels, params);

    // Check constraints against floor
    pixels.forEach(pixel => {
         const xTile = Math.floor(pixel.x / params.tileSize);
         const yTile = Math.floor(pixel.y / params.tileSize);

         if (xTile < 0 || xTile >= mapWidth || yTile < 0 || yTile >= mapHeight) return;

         const idx = yTile * (mapWidth + 1) + xTile;
         if (idx >= 0 && idx < roofArray.length) {
            const floor = floorArray[idx];
            const roof = roofArray[idx];

            if (floor !== undefined && roof !== undefined && roof - MIN_ROOF_FLOOR_DISTANCE < floor) {
               hasViolation = true;
               if (constraintMode === ConstraintMode.PUSH_FLOOR) {
                 floorArray[idx] = clampInt16(roof - MIN_ROOF_FLOOR_DISTANCE);
               } else if (constraintMode === ConstraintMode.PUSH_ROOF) {
                 roofArray[idx] = clampInt16(floor + MIN_ROOF_FLOOR_DISTANCE);
               } else if (constraintMode === ConstraintMode.BLOCK) {
                 roofArray[idx] = clampInt16(floor + MIN_ROOF_FLOOR_DISTANCE);
               }
            }
         }
    });
  }

  return { hasViolation };
}

/**
 * Convert world position to tile coordinates
 */
export function worldToTile(
  worldX: number,
  worldZ: number,
  tileIngameSize: number
): { x: number; z: number } {
  return {
    x: Math.floor(worldX / tileIngameSize),
    z: Math.floor(worldZ / tileIngameSize),
  };
}

/**
 * Convert tile coordinates to flat array index
 */
export function flattenCoords(
  x: number,
  z: number,
  mapWidth: number
): number {
  return z * (mapWidth + 1) + x;
}
