import type { LevelData } from "@/python/structSpecs/LevelTypes";
import type { TileOpResult, PlacedTile } from "./tileTypes";

/**
 * Set a tile at a specific map position (pure function)
 */
export function setTile(
  levelData: LevelData,
  mapWidth: number,
  x: number,
  z: number,
  tileId: number,
  flipH: boolean = false,
  flipV: boolean = false,
  rotation: 0 | 90 | 180 | 270 = 0,
): TileOpResult<{ levelData: LevelData }> {
  const layerData = levelData.Layr?.[1000]?.obj;
  if (!layerData || !Array.isArray(layerData)) {
    return { success: false, error: "No layer data" };
  }

  const idx = z * mapWidth + x;
  if (idx < 0 || idx >= layerData.length) {
    return { success: false, error: "Invalid tile coordinates" };
  }

  // Encode tile ID with flip/rotation flags
  const encodedTile = encodeTileValue(tileId, flipH, flipV, rotation);

  const newLayerData = [...layerData];
  newLayerData[idx] = encodedTile;

  const newLevelData: LevelData = {
    ...levelData,
    Layr: {
      ...levelData.Layr,
      1000: {
        ...levelData.Layr?.[1000],
        obj: newLayerData,
      },
    },
  };

  return {
    success: true,
    value: { levelData: newLevelData },
  };
}

/**
 * Get the tile at a specific position
 */
export function getTile(
  levelData: LevelData,
  mapWidth: number,
  x: number,
  z: number,
): TileOpResult<PlacedTile> {
  const layerData = levelData.Layr?.[1000]?.obj;
  if (!layerData || !Array.isArray(layerData)) {
    return { success: false, error: "No layer data" };
  }

  const idx = z * mapWidth + x;
  if (idx < 0 || idx >= layerData.length) {
    return { success: false, error: "Invalid tile coordinates" };
  }

  const tileValue = layerData[idx] as number;
  const { tileId, flipH, flipV, rotation } = decodeTileValue(tileValue);

  return {
    success: true,
    value: {
      x,
      z,
      tileId,
      flipH,
      flipV,
      rotation,
    },
  };
}

/**
 * Swap all occurrences of one tile with another (pure function)
 */
export function swapTiles(
  levelData: LevelData,
  fromTileId: number,
  toTileId: number,
): TileOpResult<{ levelData: LevelData; swapCount: number }> {
  const layerData = levelData.Layr?.[1000]?.obj;
  if (!layerData || !Array.isArray(layerData)) {
    return { success: false, error: "No layer data" };
  }

  let swapCount = 0;
  const newLayerData = (layerData as number[]).map((tileValue) => {
    const decoded = decodeTileValue(tileValue);
    if (decoded.tileId === fromTileId) {
      swapCount++;
      return encodeTileValue(
        toTileId,
        decoded.flipH,
        decoded.flipV,
        decoded.rotation,
      );
    }
    return tileValue;
  });

  const newLevelData: LevelData = {
    ...levelData,
    Layr: {
      ...levelData.Layr,
      1000: {
        ...levelData.Layr?.[1000],
        obj: newLayerData,
      },
    },
  };

  return {
    success: true,
    value: { levelData: newLevelData, swapCount },
  };
}

/**
 * Fill a rectangular area with a tile (pure function)
 */
export function fillTileArea(
  levelData: LevelData,
  mapWidth: number,
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
  tileId: number,
  flipH: boolean = false,
  flipV: boolean = false,
  rotation: 0 | 90 | 180 | 270 = 0,
): TileOpResult<{ levelData: LevelData; fillCount: number }> {
  const layerData = levelData.Layr?.[1000]?.obj;
  if (!layerData || !Array.isArray(layerData)) {
    return { success: false, error: "No layer data" };
  }

  const encodedTile = encodeTileValue(tileId, flipH, flipV, rotation);
  const newLayerData = [...layerData];

  const minX = Math.min(startX, endX);
  const maxX = Math.max(startX, endX);
  const minZ = Math.min(startZ, endZ);
  const maxZ = Math.max(startZ, endZ);

  let fillCount = 0;
  for (let z = minZ; z <= maxZ; z++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = z * mapWidth + x;
      if (idx >= 0 && idx < newLayerData.length) {
        newLayerData[idx] = encodedTile;
        fillCount++;
      }
    }
  }

  const newLevelData: LevelData = {
    ...levelData,
    Layr: {
      ...levelData.Layr,
      1000: {
        ...levelData.Layr?.[1000],
        obj: newLayerData,
      },
    },
  };

  return {
    success: true,
    value: { levelData: newLevelData, fillCount },
  };
}

/**
 * Count occurrences of each tile ID in the level
 */
export function countTileUsage(
  levelData: LevelData,
): Map<number, number> {
  const layerData = levelData.Layr?.[1000]?.obj;
  if (!layerData || !Array.isArray(layerData)) {
    return new Map();
  }

  const counts = new Map<number, number>();
  for (const tileValue of layerData as number[]) {
    const { tileId } = decodeTileValue(tileValue);
    counts.set(tileId, (counts.get(tileId) ?? 0) + 1);
  }

  return counts;
}

/**
 * Encode tile ID and flags into storage format
 * Format: bits 0-11: tile ID, bit 12: flipH, bit 13: flipV, bits 14-15: rotation
 */
export function encodeTileValue(
  tileId: number,
  flipH: boolean,
  flipV: boolean,
  rotation: 0 | 90 | 180 | 270,
): number {
  let value = tileId & 0x0fff;
  if (flipH) value |= 0x1000;
  if (flipV) value |= 0x2000;
  value |= (rotation / 90) << 14;
  return value;
}

/**
 * Decode tile value into components
 */
export function decodeTileValue(value: number): {
  tileId: number;
  flipH: boolean;
  flipV: boolean;
  rotation: 0 | 90 | 180 | 270;
} {
  const tileId = value & 0x0fff;
  const flipH = (value & 0x1000) !== 0;
  const flipV = (value & 0x2000) !== 0;
  const rotationIndex = (value >> 14) & 0x03;
  const rotation = (rotationIndex * 90) as 0 | 90 | 180 | 270;

  return { tileId, flipH, flipV, rotation };
}
