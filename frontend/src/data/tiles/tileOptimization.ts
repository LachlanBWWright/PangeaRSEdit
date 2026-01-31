/**
 * Tile Optimization
 * 
 * Utilities for optimizing tile data, including removing unused tiles
 * and defragmenting the tile index space.
 */

import type { TerrainData, HeaderData } from "@/python/structSpecs/LevelTypes";
import type { Draft } from "immer";
import { extractTileInfo } from "./tileDataExtractor";

/**
 * Result of tile optimization
 */
export interface TileOptimizationResult {
  success: boolean;
  removedCount: number;
  oldToNewMapping: Map<number, number>;
  message?: string;
}

/**
 * Analyze tiles to find which can be safely removed
 * This is a read-only operation that doesn't modify data
 */
export function analyzeUnusedTiles(
  terrainData: TerrainData,
  headerData: HeaderData,
): {
  unusedIndices: number[];
  canOptimize: boolean;
  estimatedSavings: number;
} {
  const tiles = extractTileInfo(terrainData, headerData);
  const unusedTiles = tiles.filter(t => t.usageCount === 0);
  
  return {
    unusedIndices: unusedTiles.map(t => t.attributeIndex),
    canOptimize: unusedTiles.length > 0,
    estimatedSavings: unusedTiles.length,
  };
}

/**
 * Create a mapping from old indices to new indices after removing unused tiles
 * Does not modify data, just computes the mapping
 */
export function computeCompactedIndexMapping(
  terrainData: TerrainData,
  headerData: HeaderData,
): Map<number, number> {
  const tiles = extractTileInfo(terrainData, headerData);
  const usedIndices = new Set(
    tiles
      .filter(t => t.usageCount > 0)
      .map(t => t.attributeIndex)
  );
  
  const mapping = new Map<number, number>();
  let newIndex = 0;
  
  const atrb = terrainData.Atrb?.[1000]?.obj;
  if (!atrb) return mapping;
  
  for (let oldIndex = 0; oldIndex < atrb.length; oldIndex++) {
    if (usedIndices.has(oldIndex)) {
      mapping.set(oldIndex, newIndex);
      newIndex++;
    }
  }
  
  return mapping;
}

/**
 * Remove unused tiles and compact the index space
 * Must be called within an Immer producer
 */
export function compactTileIndices(
  terrainDraft: Draft<TerrainData>,
  _headerData: HeaderData,
): TileOptimizationResult {
  const result: TileOptimizationResult = {
    success: false,
    removedCount: 0,
    oldToNewMapping: new Map(),
  };
  
  const atrb = terrainDraft.Atrb?.[1000]?.obj;
  const layr = terrainDraft.Layr?.[1000]?.obj;
  const xlat = terrainDraft.Xlat?.[1000]?.obj;
  
  if (!atrb || !layr) {
    result.message = "Missing required terrain data";
    return result;
  }
  
  // Find used attribute indices
  const usedIndices = new Set<number>();
  for (const idx of layr) {
    if (idx !== undefined) {
      usedIndices.add(idx);
    }
  }
  
  // Build mapping from old to new indices
  const oldToNew = new Map<number, number>();
  let newIndex = 0;
  
  for (let oldIndex = 0; oldIndex < atrb.length; oldIndex++) {
    if (usedIndices.has(oldIndex)) {
      oldToNew.set(oldIndex, newIndex);
      newIndex++;
    }
  }
  
  const removedCount = atrb.length - oldToNew.size;
  
  if (removedCount === 0) {
    result.success = true;
    result.message = "No unused tiles to remove";
    return result;
  }
  
  // Filter attributes to only used ones, preserving order
  const newAtrb = atrb.filter((_, idx) => usedIndices.has(idx));
  
  // Filter xlat table if it exists
  if (xlat) {
    const newXlat = xlat.filter((_, idx) => usedIndices.has(idx));
    terrainDraft.Xlat![1000].obj = newXlat;
  }
  
  // Remap layer indices
  for (let i = 0; i < layr.length; i++) {
    const oldIdx = layr[i];
    if (oldIdx !== undefined) {
      const newIdx = oldToNew.get(oldIdx);
      if (newIdx !== undefined) {
        layr[i] = newIdx;
      }
    }
  }
  
  // Update attribute array
  terrainDraft.Atrb[1000].obj = newAtrb;
  
  result.success = true;
  result.removedCount = removedCount;
  result.oldToNewMapping = oldToNew;
  result.message = `Removed ${removedCount} unused tile(s)`;
  
  return result;
}

/**
 * Check if optimization would cause any issues
 * Returns warnings about potential problems
 */
export function validateOptimization(
  terrainData: TerrainData,
  _headerData: HeaderData,
): string[] {
  const warnings: string[] = [];
  
  const atrb = terrainData.Atrb?.[1000]?.obj;
  const layr = terrainData.Layr?.[1000]?.obj;
  
  if (!atrb) {
    warnings.push("No tile attributes found");
    return warnings;
  }
  
  if (!layr) {
    warnings.push("No terrain layer found");
    return warnings;
  }
  
  // Check for invalid references in layer
  for (let i = 0; i < layr.length; i++) {
    const idx = layr[i];
    if (idx !== undefined && (idx < 0 || idx >= atrb.length)) {
      warnings.push(`Invalid tile reference at cell ${i}: index ${idx} out of range`);
    }
  }
  
  return warnings;
}

/**
 * Get optimization statistics
 */
export function getOptimizationStats(
  terrainData: TerrainData,
  headerData: HeaderData,
): {
  totalTiles: number;
  usedTiles: number;
  unusedTiles: number;
  percentageUnused: number;
} {
  const tiles = extractTileInfo(terrainData, headerData);
  const usedCount = tiles.filter(t => t.usageCount > 0).length;
  const unusedCount = tiles.length - usedCount;
  
  return {
    totalTiles: tiles.length,
    usedTiles: usedCount,
    unusedTiles: unusedCount,
    percentageUnused: tiles.length > 0 
      ? Math.round((unusedCount / tiles.length) * 100) 
      : 0,
  };
}
