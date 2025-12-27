/**
 * compileNanosaur1Level.ts
 * 
 * Compile a LevelData structure back to Nanosaur 1 binary format (.ter file)
 * Ensures byte-for-byte accuracy with the original format
 */

import { LevelData } from "@/python/structSpecs/LevelTypes";
import { Nanosaur1RawLevel } from "@/data/processors/classicProprocessor";

/**
 * Compile a Nanosaur 1 level from LevelData back to binary format
 * 
 * @param levelData - The LevelData structure
 * @param rawLevelData - The original raw level data (for preservation of binary-specific data)
 * @returns ArrayBuffer containing the binary .ter file data
 */
export function compileNanosaur1Level(
  levelData: LevelData,
  rawLevelData: Nanosaur1RawLevel
): ArrayBuffer {
  // Calculate total size
  const headerSize = 8 + 4 + 2 + 2; // version, mapW, mapH (all 32-bit/16-bit)
  const numItems = levelData.Itms?.[1000]?.obj?.length || 0;
  const itemsSize = numItems * 16; // Each item is 16 bytes
  
  const mapWidth = rawLevelData.header.mapWidth;
  const mapHeight = rawLevelData.header.mapHeight;
  const supertileLayerSize = mapWidth * mapHeight * 2; // 16-bit per tile
  
  const terrainTileCount = rawLevelData.terrain32x32Tiles.length;
  const heightmapTileCount = rawLevelData.heightmap32x32Tiles.length;
  const terrainDataSize = 4 + (terrainTileCount * 32 * 32 * 2); // count + tiles (16bpp)
  const heightmapDataSize = heightmapTileCount * 32 * 32; // 8bpp, no count prefix
  
  const totalSize = headerSize + itemsSize + supertileLayerSize + terrainDataSize + heightmapDataSize;
  
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let offset = 0;

  // Write header
  view.setInt32(offset, rawLevelData.header.version, false); // big-endian
  offset += 4;
  view.setInt32(offset, rawLevelData.header.mapWidth, false);
  offset += 4;
  view.setInt16(offset, rawLevelData.header.mapHeight, false);
  offset += 2;
  view.setInt16(offset, numItems, false);
  offset += 2;

  // Write items
  const items = levelData.Itms?.[1000]?.obj || [];
  for (let i = 0; i < numItems; i++) {
    const item = items[i];
    if (!item) continue;
    
    // Convert back from x,z to x,y (Nanosaur 1 uses x,y for 2D coords)
    view.setInt16(offset, Math.round(item.x), false);
    offset += 2;
    view.setInt16(offset, Math.round(item.z), false); // z was y in original
    offset += 2;
    view.setInt16(offset, item.type, false);
    offset += 2;
    view.setInt16(offset, item.p0, false);
    offset += 2;
    view.setInt16(offset, item.p1, false);
    offset += 2;
    view.setInt16(offset, item.p2, false);
    offset += 2;
    view.setInt16(offset, item.p3, false);
    offset += 2;
    view.setInt16(offset, 0, false); // padding
    offset += 2;
  }

  // Write supertile layer
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const supertileIndex = rawLevelData.supertileLayer[y * mapWidth + x] || 0;
      view.setUint16(offset, supertileIndex, false);
      offset += 2;
    }
  }

  // Write terrain tiles (32x32 16bpp ARGB1555)
  view.setInt32(offset, terrainTileCount, false);
  offset += 4;
  for (const tile of rawLevelData.terrain32x32Tiles) {
    for (let i = 0; i < tile.length; i++) {
      view.setUint16(offset, tile[i]!, false);
      offset += 2;
    }
  }

  // Write heightmap tiles (32x32 8bpp)
  for (const tile of rawLevelData.heightmap32x32Tiles) {
    for (let i = 0; i < tile.length; i++) {
      view.setUint8(offset, tile[i]!);
      offset += 1;
    }
  }

  return buffer;
}
