import {
  TopologyBrushMode,
  TopologyLayerEditMode,
  TopologyValueMode,
} from "@/data/tiles/tileAtoms";
import type { GlobalsInterface } from "@/data/globals/globals";
import { StandardHeader } from "@/python/structSpecs/LevelTypes";

// Minimum vertical distance between roof and floor (in game units)
// Ensures roof is always above floor with reasonable separation
export const MIN_ROOF_FLOOR_DISTANCE = 10;
const MIN_INT16 = -32768;
const MAX_INT16 = 32767;

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
  lineStart?: { x: number; y: number };
  lineEnd?: { x: number; y: number };
}

/**
 * Convert user-selected brush radius (in tiles) to world-space distance.
 * A minimum of 1 tile is enforced so radius=1 always affects at least one tile.
 */
export function brushRadiusToWorldRadius(
  brushRadius: number,
  tileIngameSize: number,
): number {
  return Math.max(1, brushRadius) * tileIngameSize;
}

export function distanceToLineSegment(
  pointX: number,
  pointY: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): number {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared === 0) {
    return Math.hypot(pointX - startX, pointY - startY);
  }
  const projection = ((pointX - startX) * deltaX + (pointY - startY) * deltaY) / lengthSquared;
  const clamped = Math.max(0, Math.min(1, projection));
  const closestX = startX + clamped * deltaX;
  const closestY = startY + clamped * deltaY;
  return Math.hypot(pointX - closestX, pointY - closestY);
}

/**
 * Calculate which tiles/pixels should be affected by the brush
 */
export function calculateBrushPixels(params: BrushParams): PixelType[] {
  const { centerX, centerY, radius, brushMode, value, tileSize, lineStart, lineEnd } = params;
  const pixelList: PixelType[] = [];
  if (radius <= 0 || tileSize <= 0) {
    return pixelList;
  }
  const hasLine =
    params.valueMode !== TopologyValueMode.SET_VALUE &&
    lineStart !== undefined &&
    lineEnd !== undefined;
  const lineStartPoint = lineStart ?? { x: centerX, y: centerY };
  const lineEndPoint = lineEnd ?? { x: centerX, y: centerY };

  let lineMinX = centerX;
  let lineMaxX = centerX;
  let lineMinY = centerY;
  let lineMaxY = centerY;
  if (hasLine) {
    lineMinX = Math.min(lineStartPoint.x, lineEndPoint.x);
    lineMaxX = Math.max(lineStartPoint.x, lineEndPoint.x);
    lineMinY = Math.min(lineStartPoint.y, lineEndPoint.y);
    lineMaxY = Math.max(lineStartPoint.y, lineEndPoint.y);
  }
  const baseX = lineMinX - radius;
  const baseY = lineMinY - radius;
  const width = lineMaxX - lineMinX + radius * 2;
  const height = lineMaxY - lineMinY + radius * 2;

  for (let i = 0; i <= width; i += tileSize) {
    for (let j = 0; j <= height; j += tileSize) {
      const tileX = baseX + i;
      const tileY = baseY + j;
      const radialDistance = hasLine
        ? distanceToLineSegment(
            tileX,
            tileY,
            lineStartPoint.x,
            lineStartPoint.y,
            lineEndPoint.x,
            lineEndPoint.y,
          )
        : Math.hypot(tileX - centerX, tileY - centerY);

      if (brushMode === TopologyBrushMode.CIRCLE_BRUSH) {
        if (radialDistance > radius) {
          continue;
        }
      } else if (!hasLine) {
        const xDistance = Math.abs(tileX - centerX);
        const yDistance = Math.abs(tileY - centerY);
        if (xDistance > radius || yDistance > radius) {
          continue;
        }
      }

      const normalizedDistance =
        brushMode === TopologyBrushMode.SQUARE_BRUSH && !hasLine
          ? Math.max(Math.abs(tileX - centerX), Math.abs(tileY - centerY)) / radius
          : radialDistance / radius;

      pixelList.push({
        x: tileX,
        y: tileY,
        value,
        distance: normalizedDistance,
      });
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

function getUpdatedBrushValue(
  currentValue: number,
  pixel: PixelType,
  valueMode: TopologyValueMode,
): number {
  switch (valueMode) {
    case TopologyValueMode.SET_VALUE:
      return pixel.value;
    case TopologyValueMode.DELTA_VALUE:
      return currentValue + pixel.value;
    case TopologyValueMode.DELTA_WITH_DROPOFF:
      return currentValue + pixel.value * (1 - pixel.distance);
    default:
      return currentValue;
  }
}

function clampInt16(value: number): number {
  return Math.max(MIN_INT16, Math.min(MAX_INT16, Math.round(value)));
}

function getBrushTileCoordinates(
  pixel: PixelType,
  params: BrushParams,
): { xTile: number; yTile: number } | null {
  const xTile = Math.floor(pixel.x / params.tileSize);
  const yTile = Math.floor(pixel.y / params.tileSize);

  if (
    xTile < 0 ||
    xTile >= params.header.mapWidth ||
    yTile < 0 ||
    yTile >= params.header.mapHeight
  ) {
    return null;
  }

  return { xTile, yTile };
}

function getPixelIndex(
  pixel: PixelType,
  params: BrushParams,
): number | null {
  const tileCoordinates = getBrushTileCoordinates(pixel, params);
  if (!tileCoordinates) {
    return null;
  }

  return tileCoordinates.yTile * (params.header.mapWidth + 1) + tileCoordinates.xTile;
}

function getCurrentRoofShape(
  currentFloor: number,
  currentRoof: number,
): { midpoint: number; halfDifference: number } {
  return {
    midpoint: (currentFloor + currentRoof) / 2,
    halfDifference: Math.max(
      MIN_ROOF_FLOOR_DISTANCE / 2,
      (currentRoof - currentFloor) / 2,
    ),
  };
}

export function applyTopologyBrushWithTarget(
  floorArray: Int16Array | number[],
  roofArray: Int16Array | number[] | undefined,
  pixels: PixelType[],
  params: BrushParams,
  editMode: TopologyLayerEditMode,
): void {
  if (!roofArray || editMode === TopologyLayerEditMode.FLOOR) {
    pixels.forEach((pixel) => {
      const index = getPixelIndex(pixel, params);
      if (index === null || index >= floorArray.length) {
        return;
      }

      const floorHeight = floorArray[index];
      if (floorHeight === undefined) {
        return;
      }

      const updatedFloor = clampInt16(
        getUpdatedBrushValue(floorHeight, pixel, params.valueMode),
      );
      if (!roofArray) {
        floorArray[index] = updatedFloor;
        return;
      }

      const roofHeight = roofArray[index];
      if (roofHeight === undefined) {
        floorArray[index] = updatedFloor;
        return;
      }

      floorArray[index] = Math.min(
        updatedFloor,
        roofHeight - MIN_ROOF_FLOOR_DISTANCE,
      );
    });
    return;
  }

  pixels.forEach((pixel) => {
    const index = getPixelIndex(pixel, params);
    if (
      index === null ||
      index >= floorArray.length ||
      index >= roofArray.length
    ) {
      return;
    }

    const currentFloor = floorArray[index];
    const currentRoof = roofArray[index];
    if (currentFloor === undefined || currentRoof === undefined) {
      return;
    }

    if (editMode === TopologyLayerEditMode.ROOF) {
      roofArray[index] = Math.max(
        clampInt16(getUpdatedBrushValue(currentRoof, pixel, params.valueMode)),
        currentFloor + MIN_ROOF_FLOOR_DISTANCE,
      );
      return;
    }

    const { midpoint: currentMidpoint, halfDifference: currentHalfDifference } =
      getCurrentRoofShape(currentFloor, currentRoof);

    if (editMode === TopologyLayerEditMode.MIDPOINT) {
      const nextMidpoint = getUpdatedBrushValue(
        currentMidpoint,
        pixel,
        params.valueMode,
      );
      floorArray[index] = clampInt16(nextMidpoint - currentHalfDifference);
      roofArray[index] = clampInt16(nextMidpoint + currentHalfDifference);
      return;
    }

    const nextHalfDifference = Math.max(
      MIN_ROOF_FLOOR_DISTANCE / 2,
      Math.abs(
        getUpdatedBrushValue(
          currentHalfDifference,
          pixel,
          params.valueMode,
        ),
      ),
    );
    floorArray[index] = clampInt16(currentMidpoint - nextHalfDifference);
    roofArray[index] = clampInt16(currentMidpoint + nextHalfDifference);
  });
}

/**
 * Apply dual floor/roof editing - maintains equal distance from center elevation
 * Ensures roof is always >= floor
 */
export function applyDualTopologyBrush(
  floorArray: Int16Array | number[],
  roofArray: Int16Array | number[] | undefined,
  pixels: PixelType[],
  params: BrushParams,
  centerElevation: number
): void {
  if (!roofArray) {
    // No roof data, just edit floor
    applyTopologyBrush(floorArray, pixels, params);
    return;
  }

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
    if (index < 0 || index >= floorArray.length || index >= roofArray.length) return;

    const currentFloor = floorArray[index];
    const currentRoof = roofArray[index];
    if (currentFloor === undefined || currentRoof === undefined) return;

    // Calculate distance from center for each
    const floorDistance = currentFloor - centerElevation;
    const roofDistance = currentRoof - centerElevation;

    let newCenter: number;
    switch (valueMode) {
      case TopologyValueMode.SET_VALUE:
        newCenter = pixel.value;
        break;

      case TopologyValueMode.DELTA_VALUE:
        newCenter = centerElevation + pixel.value;
        break;

      case TopologyValueMode.DELTA_WITH_DROPOFF: {
        const falloff = 1 - pixel.distance;
        newCenter = centerElevation + pixel.value * falloff;
        break;
      }

      default:
        newCenter = centerElevation;
    }

    // Apply distances to new center
    const newFloor = newCenter + floorDistance;
    const newRoof = newCenter + roofDistance;

    // Ensure roof >= floor with minimum separation
    const clampedFloor = Math.max(-32768, Math.min(32767, Math.round(newFloor)));
    const clampedRoof = Math.max(
      clampedFloor + MIN_ROOF_FLOOR_DISTANCE,
      Math.min(32767, Math.round(newRoof))
    );

    floorArray[index] = clampedFloor;
    roofArray[index] = clampedRoof;
  });
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
