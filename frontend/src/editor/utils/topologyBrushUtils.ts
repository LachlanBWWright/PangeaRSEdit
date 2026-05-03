import { TopologyBrushMode, TopologyValueMode } from "@/data/tiles/tileAtoms";
import type { GlobalsInterface } from "@/data/globals/globals";
import { StandardHeader } from "@/python/structSpecs/LevelTypes";

export const MIN_ROOF_FLOOR_DISTANCE = 10;

export interface PixelType {
  x: number;
  y: number;
  value: number;
  distance: number;
}

export interface StrokePoint {
  x: number;
  y: number;
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
  const projection =
    ((pointX - startX) * deltaX + (pointY - startY) * deltaY) / lengthSquared;
  const clamped = Math.max(0, Math.min(1, projection));
  const closestX = startX + clamped * deltaX;
  const closestY = startY + clamped * deltaY;
  return Math.hypot(pointX - closestX, pointY - closestY);
}

/**
 * Calculate which tiles/pixels should be affected by the brush
 */
export function calculateBrushPixels(params: BrushParams): PixelType[] {
  const {
    centerX,
    centerY,
    radius,
    brushMode,
    value,
    tileSize,
    lineStart,
    lineEnd,
  } = params;
  const pixelList: PixelType[] = [];
  if (radius <= 0 || tileSize <= 0) {
    return pixelList;
  }
  const hasLine = lineStart !== undefined && lineEnd !== undefined;
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
          ? Math.max(Math.abs(tileX - centerX), Math.abs(tileY - centerY)) /
            radius
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

function getPixelKey(pixel: PixelType): string {
  return `${String(pixel.x)},${String(pixel.y)}`;
}

export function mergeBrushPixels(
  pixelGroups: readonly (readonly PixelType[])[],
): PixelType[] {
  const mergedPixels = new Map<string, PixelType>();

  pixelGroups.forEach((pixels) => {
    pixels.forEach((pixel) => {
      const key = getPixelKey(pixel);
      const existingPixel = mergedPixels.get(key);

      if (!existingPixel || pixel.distance < existingPixel.distance) {
        mergedPixels.set(key, pixel);
      }
    });
  });

  return Array.from(mergedPixels.values());
}

export function cloneHeightArray(
  heightArray: Int16Array | number[] | undefined,
): number[] | undefined {
  if (!heightArray) {
    return undefined;
  }

  return Array.from(heightArray);
}

/**
 * Apply brush modifications to the terrain height array
 */
export function applyTopologyBrush(
  ycrdArray: Int16Array | number[],
  pixels: PixelType[],
  params: BrushParams,
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
    ycrdArray[index] = Math.max(-32768, Math.min(32767, Math.round(newValue)));
  });
}

export {
  applyDualTopologyBrush,
  applyTopologyBrushToSnapshot,
  applyTopologyBrushWithTarget,
  flattenCoords,
  worldToTile,
} from "./topologyBrushTargeting";
