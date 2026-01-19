import type { LevelData } from "@/python/structSpecs/LevelTypes";
import type { LevelOpResult, LevelChange } from "./types";

/**
 * Set terrain height at a specific tile vertex (pure function)
 * Note: YCrd is (mapWidth + 1) × (mapHeight + 1) for vertex heights
 */
export function setTerrainHeight(
  levelData: LevelData,
  tileX: number,
  tileZ: number,
  height: number,
): LevelOpResult<{ levelData: LevelData }> {
  const header = levelData.Hedr?.[1000]?.obj;
  if (!header) {
    return { success: false, error: "No header in level data" };
  }

  const mapWidth = header.mapWidth;
  const heights = levelData.YCrd?.[1000]?.obj;
  if (!heights || !Array.isArray(heights)) {
    return { success: false, error: "No height data" };
  }

  const idx = tileZ * (mapWidth + 1) + tileX;
  if (idx < 0 || idx >= heights.length) {
    return { success: false, error: "Invalid tile coordinates" };
  }

  const oldHeight = heights[idx];
  const newHeights = [...heights];
  newHeights[idx] = height;

  const newLevelData: LevelData = {
    ...levelData,
    YCrd: {
      ...levelData.YCrd,
      1000: {
        ...levelData.YCrd?.[1000],
        obj: newHeights,
      },
    },
  };

  const change: LevelChange = {
    type: "terrain",
    operation: "update",
    path: ["YCrd", "1000", "obj", String(idx)],
    oldValue: oldHeight,
    newValue: height,
  };

  return {
    success: true,
    value: { levelData: newLevelData },
    changes: [change],
  };
}

/**
 * Get terrain height at a specific tile vertex
 */
export function getTerrainHeight(
  levelData: LevelData,
  tileX: number,
  tileZ: number,
): number | undefined {
  const header = levelData.Hedr?.[1000]?.obj;
  if (!header) return undefined;

  const mapWidth = header.mapWidth;
  const heights = levelData.YCrd?.[1000]?.obj;
  if (!heights || !Array.isArray(heights)) return undefined;

  const idx = tileZ * (mapWidth + 1) + tileX;
  if (idx < 0 || idx >= heights.length) return undefined;

  return heights[idx] as number;
}

/**
 * Set tile attribute (pure function)
 */
export function setTileAttribute(
  levelData: LevelData,
  tileX: number,
  tileZ: number,
  attribute: { flags?: number; p0?: number; p1?: number },
): LevelOpResult<{ levelData: LevelData }> {
  const header = levelData.Hedr?.[1000]?.obj;
  if (!header) {
    return { success: false, error: "No header" };
  }

  const mapWidth = header.mapWidth;
  const attrs = levelData.Atrb?.[1000]?.obj;
  if (!attrs || !Array.isArray(attrs)) {
    return { success: false, error: "No attribute data" };
  }

  const idx = tileZ * mapWidth + tileX;
  if (idx < 0 || idx >= attrs.length) {
    return { success: false, error: "Invalid tile coordinates" };
  }

  const oldAttr = attrs[idx];
  const newAttr = { ...oldAttr, ...attribute };
  const newAttrs = [...attrs];
  newAttrs[idx] = newAttr;

  const newLevelData: LevelData = {
    ...levelData,
    Atrb: {
      ...levelData.Atrb,
      1000: {
        ...levelData.Atrb?.[1000],
        obj: newAttrs,
      },
    },
  };

  const change: LevelChange = {
    type: "terrain",
    operation: "update",
    path: ["Atrb", "1000", "obj", String(idx)],
    oldValue: oldAttr,
    newValue: newAttr,
  };

  return {
    success: true,
    value: { levelData: newLevelData },
    changes: [change],
  };
}

/**
 * Get tile attribute
 */
export function getTileAttribute(
  levelData: LevelData,
  tileX: number,
  tileZ: number,
): { flags: number; p0: number; p1: number } | undefined {
  const header = levelData.Hedr?.[1000]?.obj;
  if (!header) return undefined;

  const mapWidth = header.mapWidth;
  const attrs = levelData.Atrb?.[1000]?.obj;
  if (!attrs || !Array.isArray(attrs)) return undefined;

  const idx = tileZ * mapWidth + tileX;
  if (idx < 0 || idx >= attrs.length) return undefined;

  return attrs[idx] as { flags: number; p0: number; p1: number };
}

/**
 * Get level dimensions from header
 */
export function getLevelDimensions(
  levelData: LevelData,
): { mapWidth: number; mapHeight: number } | undefined {
  const header = levelData.Hedr?.[1000]?.obj;
  if (!header) return undefined;

  return {
    mapWidth: header.mapWidth,
    mapHeight: header.mapHeight,
  };
}
