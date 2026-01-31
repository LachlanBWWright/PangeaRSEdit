/**
 * Tile Paint Handler
 * 
 * Implements painting operations for tile-based games.
 * Includes single tile painting, brush painting, flood fill, and eyedropper.
 */

import type { TerrainData, HeaderData } from "@/python/structSpecs/LevelTypes";
import type { Draft } from "immer";
import type { TileInfo } from "./tileDataExtractor";
import { getTileAtPosition } from "./tileDataExtractor";

/**
 * Result of a paint operation
 */
export interface TilePaintResult {
  success: boolean;
  modifiedCells: number[];
  message?: string;
}

/**
 * Paint a single tile at a specific map position
 * Must be called within an Immer producer
 */
export function paintTileAtPosition(
  x: number,
  z: number,
  selectedTile: TileInfo,
  terrainDraft: Draft<TerrainData>,
  headerData: HeaderData,
): TilePaintResult {
  const result: TilePaintResult = { success: false, modifiedCells: [] };
  
  const header = headerData.Hedr[1000].obj;
  const layr = terrainDraft.Layr?.[1000]?.obj;
  
  if (!layr) {
    result.message = "No terrain layer data";
    return result;
  }
  
  // Bounds check
  if (x < 0 || x >= header.mapWidth || z < 0 || z >= header.mapHeight) {
    result.message = "Position out of bounds";
    return result;
  }
  
  const cellIndex = z * header.mapWidth + x;
  
  // Set the cell to use the selected tile's attribute index
  layr[cellIndex] = selectedTile.attributeIndex;
  
  result.success = true;
  result.modifiedCells.push(cellIndex);
  
  return result;
}

/**
 * Paint tiles in a brush area
 * Must be called within an Immer producer
 */
export function paintTileBrush(
  centerX: number,
  centerZ: number,
  brushRadius: number,
  selectedTile: TileInfo,
  terrainDraft: Draft<TerrainData>,
  headerData: HeaderData,
): TilePaintResult {
  const result: TilePaintResult = { success: false, modifiedCells: [] };
  
  const header = headerData.Hedr[1000].obj;
  const layr = terrainDraft.Layr?.[1000]?.obj;
  
  if (!layr) {
    result.message = "No terrain layer data";
    return result;
  }
  
  // Generate brush positions (circular brush)
  for (let dz = -brushRadius + 1; dz < brushRadius; dz++) {
    for (let dx = -brushRadius + 1; dx < brushRadius; dx++) {
      const x = centerX + dx;
      const z = centerZ + dz;
      
      // Bounds check
      if (x < 0 || x >= header.mapWidth || z < 0 || z >= header.mapHeight) {
        continue;
      }
      
      // Radius check (circular brush)
      if (Math.sqrt(dx * dx + dz * dz) > brushRadius) {
        continue;
      }
      
      const cellIndex = z * header.mapWidth + x;
      layr[cellIndex] = selectedTile.attributeIndex;
      result.modifiedCells.push(cellIndex);
    }
  }
  
  result.success = result.modifiedCells.length > 0;
  
  return result;
}

/**
 * Flood fill from a position with selected tile
 * Must be called within an Immer producer
 */
export function floodFillTile(
  startX: number,
  startZ: number,
  selectedTile: TileInfo,
  terrainDraft: Draft<TerrainData>,
  headerData: HeaderData,
  maxFill: number = 10000,
): TilePaintResult {
  const result: TilePaintResult = { success: false, modifiedCells: [] };
  
  const header = headerData.Hedr[1000].obj;
  const layr = terrainDraft.Layr?.[1000]?.obj;
  
  if (!layr) {
    result.message = "No terrain layer data";
    return result;
  }
  
  // Get the target attribute to replace
  const startIndex = startZ * header.mapWidth + startX;
  const targetAttrIndex = layr[startIndex];
  
  if (targetAttrIndex === undefined) {
    result.message = "Invalid start position";
    return result;
  }
  
  // Don't fill if already the same tile
  if (targetAttrIndex === selectedTile.attributeIndex) {
    result.message = "Already the same tile";
    return result;
  }
  
  // Flood fill using BFS
  const queue: Array<[number, number]> = [[startX, startZ]];
  const visited = new Set<number>();
  
  while (queue.length > 0 && result.modifiedCells.length < maxFill) {
    const next = queue.shift();
    if (!next) break;
    
    const [x, z] = next;
    const cellIndex = z * header.mapWidth + x;
    
    // Skip if already visited
    if (visited.has(cellIndex)) continue;
    
    // Bounds check
    if (x < 0 || x >= header.mapWidth || z < 0 || z >= header.mapHeight) {
      continue;
    }
    
    // Only fill cells with the target attribute
    if (layr[cellIndex] !== targetAttrIndex) continue;
    
    visited.add(cellIndex);
    layr[cellIndex] = selectedTile.attributeIndex;
    result.modifiedCells.push(cellIndex);
    
    // Add neighbors to queue
    queue.push([x + 1, z]);
    queue.push([x - 1, z]);
    queue.push([x, z + 1]);
    queue.push([x, z - 1]);
  }
  
  result.success = result.modifiedCells.length > 0;
  
  if (result.modifiedCells.length >= maxFill) {
    result.message = `Fill limited to ${maxFill} tiles`;
  }
  
  return result;
}

/**
 * Pick tile from map position (eyedropper tool)
 * This is a read-only operation, doesn't need Immer
 */
export function pickTileAtPosition(
  x: number,
  z: number,
  terrainData: TerrainData,
  headerData: HeaderData,
): TileInfo | null {
  return getTileAtPosition(x, z, terrainData, headerData);
}

/**
 * Replace all instances of one tile with another
 * Must be called within an Immer producer
 */
export function replaceAllTiles(
  fromAttributeIndex: number,
  toTile: TileInfo,
  terrainDraft: Draft<TerrainData>,
  _headerData: HeaderData,
): TilePaintResult {
  const result: TilePaintResult = { success: false, modifiedCells: [] };
  
  const layr = terrainDraft.Layr?.[1000]?.obj;
  
  if (!layr) {
    result.message = "No terrain layer data";
    return result;
  }
  
  // Find and replace all instances
  for (let i = 0; i < layr.length; i++) {
    if (layr[i] === fromAttributeIndex) {
      layr[i] = toTile.attributeIndex;
      result.modifiedCells.push(i);
    }
  }
  
  result.success = result.modifiedCells.length > 0;
  
  if (!result.success) {
    result.message = "No tiles found to replace";
  }
  
  return result;
}

/**
 * Get a rectangular selection of tiles
 */
export function getSelectedTileRegion(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  terrainData: TerrainData,
  headerData: HeaderData,
): number[] {
  const headerObj = headerData.Hedr[1000].obj;
  const layr = terrainData.Layr?.[1000]?.obj;
  
  if (!layr) return [];
  
  const minX = Math.max(0, Math.min(x1, x2));
  const maxX = Math.min(headerObj.mapWidth - 1, Math.max(x1, x2));
  const minZ = Math.max(0, Math.min(z1, z2));
  const maxZ = Math.min(headerObj.mapHeight - 1, Math.max(z1, z2));
  
  const cellIndices: number[] = [];
  
  for (let z = minZ; z <= maxZ; z++) {
    for (let x = minX; x <= maxX; x++) {
      const cellIndex = z * headerObj.mapWidth + x;
      cellIndices.push(cellIndex);
    }
  }
  
  return cellIndices;
}
