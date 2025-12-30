import { LevelData } from "@/python/structSpecs/LevelTypes";
import type { Nanosaur1LevelData } from "@/data/processors/classicProprocessor";
import { Result, ok, err } from "@/types/result";

/**
 * Compile a Nanosaur 1 level from LevelData back to binary format
 * 
 * @param levelData - The LevelData structure
 * @param rawLevelData - The original raw level data (for preservation of binary-specific data)
 * @returns Result containing the ArrayBuffer with binary .ter file data, or error
 */
export function compileNanosaur1Level(
  levelData: LevelData,
  rawLevelData: Nanosaur1LevelData
): Result<ArrayBuffer, Error> {
  try {
    // Calculate total size
    const headerSize = 8 + 4 + 2 + 2; // 8 bytes for first two int32s, then width (32-bit), depth (16-bit), numItems (16-bit)
    const numItems = levelData.Itms?.[1000]?.obj?.length || 0;
    const itemsSize = numItems * 16; // Each item is 16 bytes
    
    const mapWidth = rawLevelData.header.width;
    const mapHeight = rawLevelData.header.depth; // depth is the Z-axis (height in 2D view)
    const supertileLayerSize = mapWidth * mapHeight * 2; // 16-bit per tile
    
    // Get terrain tiles from metadata (should be stored during parse)
    const metadataTiles = levelData._metadata?.terrainTiles;
    const terrainTiles = Array.isArray(metadataTiles)
      ? metadataTiles.filter(
          (tile): tile is Uint16Array => tile instanceof Uint16Array,
        )
      : [];
    const heightmapTiles = rawLevelData.heightmapTiles || [];
    const terrainTileCount = terrainTiles.length;
    const heightmapTileCount = heightmapTiles.length;
    const terrainDataSize = 4 + (terrainTileCount * 32 * 32 * 2); // count + tiles (16bpp)
    const heightmapDataSize = heightmapTileCount * 32 * 32; // 8bpp, no count prefix
    
    const totalSize = headerSize + itemsSize + supertileLayerSize + terrainDataSize + heightmapDataSize;
    
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    let offset = 0;

    // Write simplified header (we're not writing full Nanosaur 1 format, just essential data)
    // This is a simplified version for editing - full binary format is more complex
    view.setInt32(offset, 0x4E414E4F, false); // 'NANO' magic number (big-endian)
    offset += 4;
    view.setInt32(offset, 1, false); // version 1
    offset += 4;
    view.setInt32(offset, rawLevelData.header.width, false);
    offset += 4;
    view.setInt16(offset, rawLevelData.header.depth, false);
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
    const supertileLayer = rawLevelData.textureLayer;
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const supertileIndex = supertileLayer[y * mapWidth + x];
        if (supertileIndex === undefined) {
          return err(new Error(`Missing supertile at position (${x}, ${y})`));
        }
        view.setUint16(offset, supertileIndex, false);
        offset += 2;
      }
    }

    // Write terrain tiles (32x32 16bpp ARGB1555)
    view.setInt32(offset, terrainTileCount, false);
    offset += 4;
    for (const tile of terrainTiles) {
      for (let i = 0; i < tile.length; i++) {
        const pixelValue = tile[i];
        if (pixelValue === undefined) {
          return err(new Error(`Missing terrain pixel at index ${i}`));
        }
        view.setUint16(offset, pixelValue, false);
        offset += 2;
      }
    }

    // Write heightmap tiles (32x32 8bpp)
    for (const tile of heightmapTiles) {
      for (let i = 0; i < tile.length; i++) {
        const heightValue = tile[i];
        if (heightValue === undefined) {
          return err(new Error(`Missing heightmap value at index ${i}`));
        }
        view.setUint8(offset, heightValue);
        offset += 1;
      }
    }

    return ok(buffer);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
