/**
 * Tile Data Extractor
 * 
 * Extracts tile information from level data for tile-based games.
 * Provides utilities for analyzing tile usage and attributes.
 */

import type { TerrainData, HeaderData } from "@/python/structSpecs/LevelTypes";
import { extractTileNumber } from "./tileStructures";

/**
 * Information about a single tile
 */
export interface TileInfo {
  index: number;
  attributeIndex: number;
  usageCount: number;
  flags: number;
  p0: number;
  p1: number;
  bits?: number;
}

/**
 * Tile attribute from the Atrb array (Bugdom/Nanosaur style)
 */
interface ExtendedTileAttribute {
  bits?: number;
  parm0?: number;
  parm1?: number;
  parm2?: number;
  undefined?: number;
  flags: number;
  p0: number;
  p1: number;
}

/**
 * Extract all unique tiles from terrain data
 */
export function extractTileInfo(
  terrainData: TerrainData,
  _headerData: HeaderData,
): TileInfo[] {
  const tiles: TileInfo[] = [];
  
  const atrb = terrainData.Atrb?.[1000]?.obj;
  const layr = terrainData.Layr?.[1000]?.obj;
  const xlat = terrainData.Xlat?.[1000]?.obj;
  
  if (!atrb || !layr) {
    return tiles;
  }
  
  // Count usage of each attribute index
  const usageCounts = new Map<number, number>();
  for (const attrIndex of layr) {
    if (attrIndex !== undefined) {
      usageCounts.set(attrIndex, (usageCounts.get(attrIndex) ?? 0) + 1);
    }
  }
  
  // Build tile info for each unique tile
  for (let attrIndex = 0; attrIndex < atrb.length; attrIndex++) {
    const attr = atrb[attrIndex] as ExtendedTileAttribute | undefined;
    if (!attr) continue;
    
    // Get actual tile index from translation table if available
    const xlatEntry = xlat?.[attrIndex];
    const tileIndex = xlatEntry?.idx ?? attrIndex;
    
    // Extract tile number from bits if present (for Bugdom/Nanosaur)
    const baseTileNumber = attr.bits !== undefined
      ? extractTileNumber(attr.bits)
      : tileIndex;
    
    tiles.push({
      index: baseTileNumber,
      attributeIndex: attrIndex,
      usageCount: usageCounts.get(attrIndex) ?? 0,
      flags: attr.flags,
      p0: attr.p0,
      p1: attr.p1,
      bits: attr.bits,
    });
  }
  
  return tiles;
}

/**
 * Tile usage statistics
 */
export interface TileUsageStats {
  totalTiles: number;
  usedTiles: number;
  unusedTiles: number;
  mostUsedTile: TileInfo | null;
  leastUsedTile: TileInfo | null;
  totalCells: number;
}

/**
 * Get tile usage statistics
 */
export function getTileUsageStats(
  terrainData: TerrainData,
  headerData: HeaderData,
): TileUsageStats {
  const tiles = extractTileInfo(terrainData, headerData);
  const usedTiles = tiles.filter(t => t.usageCount > 0);
  const unusedTiles = tiles.filter(t => t.usageCount === 0);
  
  // Sort by usage to find most/least used
  const sortedByUsage = [...usedTiles].sort((a, b) => b.usageCount - a.usageCount);
  
  const header = headerData.Hedr[1000].obj;
  const totalCells = header.mapWidth * header.mapHeight;
  
  return {
    totalTiles: tiles.length,
    usedTiles: usedTiles.length,
    unusedTiles: unusedTiles.length,
    mostUsedTile: sortedByUsage[0] ?? null,
    leastUsedTile: sortedByUsage[sortedByUsage.length - 1] ?? null,
    totalCells,
  };
}

/**
 * Get tile at a specific map position
 */
export function getTileAtPosition(
  x: number,
  z: number,
  terrainData: TerrainData,
  headerData: HeaderData,
): TileInfo | null {
  const header = headerData.Hedr[1000].obj;
  const layr = terrainData.Layr?.[1000]?.obj;
  const atrb = terrainData.Atrb?.[1000]?.obj;
  const xlat = terrainData.Xlat?.[1000]?.obj;
  
  if (!layr || !atrb) return null;
  if (x < 0 || x >= header.mapWidth || z < 0 || z >= header.mapHeight) return null;
  
  const cellIndex = z * header.mapWidth + x;
  const attrIndex = layr[cellIndex];
  
  if (attrIndex === undefined) return null;
  
  const attr = atrb[attrIndex] as ExtendedTileAttribute | undefined;
  if (!attr) return null;
  
  const xlatEntry = xlat?.[attrIndex];
  const tileIndex = xlatEntry?.idx ?? attrIndex;
  const baseTileNumber = attr.bits !== undefined
    ? extractTileNumber(attr.bits)
    : tileIndex;
  
  // Count usage
  let usageCount = 0;
  for (const idx of layr) {
    if (idx === attrIndex) usageCount++;
  }
  
  return {
    index: baseTileNumber,
    attributeIndex: attrIndex,
    usageCount,
    flags: attr.flags,
    p0: attr.p0,
    p1: attr.p1,
    bits: attr.bits,
  };
}

/**
 * Find all positions where a specific tile is used
 */
export function findTilePositions(
  attributeIndex: number,
  terrainData: TerrainData,
  headerData: HeaderData,
): Array<{ x: number; z: number }> {
  const positions: Array<{ x: number; z: number }> = [];
  
  const header = headerData.Hedr[1000].obj;
  const layr = terrainData.Layr?.[1000]?.obj;
  
  if (!layr) return positions;
  
  for (let z = 0; z < header.mapHeight; z++) {
    for (let x = 0; x < header.mapWidth; x++) {
      const cellIndex = z * header.mapWidth + x;
      if (layr[cellIndex] === attributeIndex) {
        positions.push({ x, z });
      }
    }
  }
  
  return positions;
}

/**
 * Get unused attribute indices (tiles not used on the map)
 */
export function getUnusedTileIndices(
  terrainData: TerrainData,
  headerData: HeaderData,
): number[] {
  const tiles = extractTileInfo(terrainData, headerData);
  return tiles
    .filter(t => t.usageCount === 0)
    .map(t => t.attributeIndex);
}
