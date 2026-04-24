import {
  TopologyDualEditMode,
  TopologyLayerEditMode,
  TopologyValueMode,
} from "@/data/tiles/tileAtoms";
import type { BrushParams, PixelType } from "./topologyBrushUtils";
import { applyTopologyBrush, cloneHeightArray } from "./topologyBrushUtils";

const MIN_ROOF_FLOOR_DISTANCE = 10;
const MIN_INT16 = -32768;
const MAX_INT16 = 32767;

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

function getPixelIndex(pixel: PixelType, params: BrushParams): number | null {
  const tileCoordinates = getBrushTileCoordinates(pixel, params);
  if (!tileCoordinates) return null;
  return (
    tileCoordinates.yTile * (params.header.mapWidth + 1) + tileCoordinates.xTile
  );
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
  dualEditMode: TopologyDualEditMode = TopologyDualEditMode.MIDPOINT,
): void {
  if (!roofArray || editMode === TopologyLayerEditMode.FLOOR) {
    pixels.forEach((pixel) => {
      const index = getPixelIndex(pixel, params);
      if (index === null || index >= floorArray.length) return;

      const floorHeight = floorArray[index];
      if (floorHeight === undefined) return;

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
    if (currentFloor === undefined || currentRoof === undefined) return;

    if (editMode === TopologyLayerEditMode.ROOF) {
      roofArray[index] = Math.max(
        clampInt16(getUpdatedBrushValue(currentRoof, pixel, params.valueMode)),
        currentFloor + MIN_ROOF_FLOOR_DISTANCE,
      );
      return;
    }

    const { midpoint: currentMidpoint, halfDifference: currentHalfDifference } =
      getCurrentRoofShape(currentFloor, currentRoof);

    if (dualEditMode === TopologyDualEditMode.MIDPOINT) {
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
        getUpdatedBrushValue(currentHalfDifference, pixel, params.valueMode),
      ),
    );
    floorArray[index] = clampInt16(currentMidpoint - nextHalfDifference);
    roofArray[index] = clampInt16(currentMidpoint + nextHalfDifference);
  });
}

export function applyTopologyBrushToSnapshot(
  floorArray: Int16Array | number[],
  roofArray: Int16Array | number[] | undefined,
  pixels: PixelType[],
  params: BrushParams,
  editMode: TopologyLayerEditMode,
  dualEditMode: TopologyDualEditMode = TopologyDualEditMode.MIDPOINT,
): { floor: number[]; roof: number[] | undefined } {
  const nextFloor = cloneHeightArray(floorArray) ?? [];
  const nextRoof = cloneHeightArray(roofArray);

  applyTopologyBrushWithTarget(
    nextFloor,
    nextRoof,
    pixels,
    params,
    editMode,
    dualEditMode,
  );

  return { floor: nextFloor, roof: nextRoof };
}

export function applyDualTopologyBrush(
  floorArray: Int16Array | number[],
  roofArray: Int16Array | number[] | undefined,
  pixels: PixelType[],
  params: BrushParams,
  centerElevation: number,
): void {
  if (!roofArray) {
    applyTopologyBrush(floorArray, pixels, params);
    return;
  }

  const { valueMode, header } = params;
  const mapWidth = header.mapWidth;
  const mapHeight = header.mapHeight;

  pixels.forEach((pixel) => {
    const xTile = Math.floor(pixel.x / params.tileSize);
    const yTile = Math.floor(pixel.y / params.tileSize);

    if (xTile < 0 || xTile >= mapWidth || yTile < 0 || yTile >= mapHeight) {
      return;
    }

    const index = yTile * (mapWidth + 1) + xTile;
    if (index < 0 || index >= floorArray.length || index >= roofArray.length)
      return;

    const currentFloor = floorArray[index];
    const currentRoof = roofArray[index];
    if (currentFloor === undefined || currentRoof === undefined) return;

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

    const newFloor = newCenter + floorDistance;
    const newRoof = newCenter + roofDistance;

    const clampedFloor = Math.max(
      MIN_INT16,
      Math.min(MAX_INT16, Math.round(newFloor)),
    );
    const clampedRoof = Math.max(
      clampedFloor + MIN_ROOF_FLOOR_DISTANCE,
      Math.min(MAX_INT16, Math.round(newRoof)),
    );

    floorArray[index] = clampedFloor;
    roofArray[index] = clampedRoof;
  });
}

export function worldToTile(
  worldX: number,
  worldZ: number,
  tileIngameSize: number,
): { x: number; z: number } {
  return {
    x: Math.floor(worldX / tileIngameSize),
    z: Math.floor(worldZ / tileIngameSize),
  };
}

export function flattenCoords(x: number, z: number, mapWidth: number): number {
  return z * (mapWidth + 1) + x;
}
