// parseMightyMike.ts
// TypeScript parser for MightyMike .map and .tileset files

import { err, isOk, ok, type Result } from "../types/result";
import type {
  MightyMikeTileSet,
  MightyMikeMap,
  MightyMikeTileAttribute,
  MightyMikeTileAnimation,
  MightyMikeItem,
  MightyMikeLevel,
} from "../python/structSpecs/mightyMikeInterface";
import {
  rlwDecompress,
  rlwCompress,
  rlbDecompress,
  PACK_TYPE_RLB,
  PACK_TYPE_RLW,
} from "../utils/rlwDecompress";

/**
 * Decompress a Mighty Mike packed file if needed
 * Tilesets use RLB (type 0), maps use RLW (type 6)
 */
function decompressIfNeeded(buffer: ArrayBuffer): ArrayBuffer {
  const view = new DataView(buffer);
  const compressionType = view.getUint32(4, false);

  // Check if this looks like a packed file (compression type 0-6)
  if (compressionType <= 6) {
    if (compressionType === PACK_TYPE_RLB) {
      // Tileset files use RLB (byte-level) compression
      const result = rlbDecompress(buffer);
      if (isOk(result)) {
        return result.value.data;
      } else {
        console.warn(`RLB decompression failed:`, result.error);
        return buffer;
      }
    } else if (compressionType === PACK_TYPE_RLW) {
      // Map files use RLW (word-level) compression
      const result = rlwDecompress(buffer);
      if (isOk(result)) {
        return result.value.data;
      } else {
        console.warn(`RLW decompression failed:`, result.error);
        return buffer;
      }
    } else {
      // Unknown compression type, return as-is
      return buffer;
    }
  }
  return buffer;
}

/**
 * Create a default palette (grayscale with better contrast)
 * This is used when actual palette data is not available
 */
function createDefaultPalette(): Uint8Array {
  const palette = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    // Use a slightly improved grayscale with better contrast
    const value = Math.floor((i / 255) * 255);
    palette[i * 4 + 0] = value; // R
    palette[i * 4 + 1] = value; // G
    palette[i * 4 + 2] = value; // B
    palette[i * 4 + 3] = 255; // A (fully opaque)
  }
  return palette;
}

/**
 * Parse tile images from tileset buffer
 * Mighty Mike tiles are 32x32 pixels, stored as 8-bit indexed color
 *
 * IMPORTANT: This function creates canvas snapshots of tiles at the time of parsing.
 * To match the original C code behavior more closely (where tiles are rendered at
 * display time with the current palette), tiles should ideally be re-rendered whenever
 * the palette changes. For now, we snapshot the palette at parse time.
 *
 * Transparency handling:
 * - The transparencyColors array from the tileset is for COLLISION DETECTION only
 *   (matches gColorMaskArray in Playfield.c), NOT for visual rendering
 * - For visual rendering, DO NOT mark any pixels as transparent based on palette index
 * - All pixels are rendered with their palette color as-is
 */
function parseTileImages(
  buffer: ArrayBuffer,
  offsetToTileDefinitions: number,
  numTileDefinitions: number,
  _transparencyColors?: number[], // Note: transparency colors are for collision detection only
  palette?: Uint8Array,
): HTMLCanvasElement[] {
  const tileImages: HTMLCanvasElement[] = [];
  const TILE_SIZE = 32;
  const BYTES_PER_TILE = TILE_SIZE * TILE_SIZE; // 32x32 = 1024 bytes per tile (8-bit indexed)

  // Use provided palette or fall back to default grayscale
  const colorPalette = palette || createDefaultPalette();

  if (!palette && numTileDefinitions > 0) {
    console.warn(
      "[TILE RENDER] ⚠️ NO PALETTE PROVIDED - Using default grayscale fallback! This will result in gray tiles!",
    );
  }

  // NOTE: In the original C code, transparency colors (gColorMaskArray) are used ONLY
  // for collision detection via the render engine's collision system.
  // They are NOT used to make pixels visually transparent.
  // Every pixel is rendered with its palette color.
  // Therefore, we do NOT create a colorIsTransparent array for visual rendering.

  const tileData = new Uint8Array(buffer, offsetToTileDefinitions);

  for (let tileIndex = 0; tileIndex < numTileDefinitions; tileIndex++) {
    const canvas = document.createElement("canvas");
    canvas.width = TILE_SIZE;
    canvas.height = TILE_SIZE;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      console.warn(`Failed to get canvas context for tile ${tileIndex}`);
      continue;
    }

    const imageData = ctx.createImageData(TILE_SIZE, TILE_SIZE);
    const offset = tileIndex * BYTES_PER_TILE;

    // Convert indexed color to RGBA
    // All pixels use their palette color; no special transparency handling
    for (let i = 0; i < BYTES_PER_TILE; i++) {
      if (offset + i >= tileData.length) break;

      const colorIndex = tileData[offset + i];
      const pixelOffset = i * 4;

      // Bounds check for palette access
      const colorIdx = colorIndex || 0; // Default to 0 if undefined
      const paletteOffset = (colorIdx & 0xff) * 4;
      if (paletteOffset + 3 < colorPalette.length) {
        // Copy RGBA directly from palette
        imageData.data[pixelOffset + 0] = colorPalette[paletteOffset] ?? 0;
        imageData.data[pixelOffset + 1] = colorPalette[paletteOffset + 1] ?? 0;
        imageData.data[pixelOffset + 2] = colorPalette[paletteOffset + 2] ?? 0;
        imageData.data[pixelOffset + 3] = colorPalette[paletteOffset + 3] ?? 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    tileImages.push(canvas);
  }

  return tileImages;
}

export function parseMightyMikeTileSet(
  buffer: ArrayBuffer,
  palette?: Uint8Array,
): Result<MightyMikeTileSet, string> {
  // Decompress if needed
  const decompressedBuffer = decompressIfNeeded(buffer);
    const data = new DataView(decompressedBuffer);
    const dataLength = decompressedBuffer.byteLength;

    // Parse header offsets (big-endian 32-bit integers)
    const offsetToTileDefinitions = data.getUint32(6, false) + 2; // +2 to skip count word
    const offsetToXlateTable = data.getUint32(10, false) + 2;
    const offsetToTileAttributes = data.getUint32(14, false) + 2;
    const offsetToTileAnimList = data.getUint32(22, false) + 2;
    const offsetToTileXparentList = data.getUint32(26, false) + 2;

    // Verify offsets are in ascending order (like original C code assertions)
    const offsets = [
      { name: "TileDefinitions", value: offsetToTileDefinitions },
      { name: "XlateTable", value: offsetToXlateTable },
      { name: "TileAttributes", value: offsetToTileAttributes },
      { name: "TileAnimList", value: offsetToTileAnimList },
      { name: "TileXparentList", value: offsetToTileXparentList },
    ];

    // Offsets parsed; diagnostic tests will collect and log details if needed.

    for (let i = 0; i < offsets.length - 1; i++) {
      const offset1 = offsets[i];
      const offset2 = offsets[i + 1];
      if (!offset1 || !offset2) {
        return err(`Invalid tileset: missing offset at index ${i}`);
      }
      if (offset1.value >= offset2.value) {
        return err(
          `Invalid tileset: offset ${offset1.name} (${offset1.value}) >= ${offset2.name} (${offset2.value})`,
        );
      }
    }

    // Validate offsets are within bounds
    if (
      offsetToTileDefinitions >= dataLength ||
      offsetToXlateTable >= dataLength ||
      offsetToTileAttributes >= dataLength ||
      offsetToTileAnimList >= dataLength ||
      offsetToTileXparentList >= dataLength
    ) {
      return err("Invalid tileset file: offsets out of bounds");
    }

    // Parse counts (16-bit big-endian integers before each section)
    const numTileDefinitions = data.getUint16(
      offsetToTileDefinitions - 2,
      false,
    );
    const numXlateEntries = data.getUint16(offsetToXlateTable - 2, false);
    const numTileAttributeEntries = data.getUint16(
      offsetToTileAttributes - 2,
      false,
    );
    const numTileAnims = data.getUint16(offsetToTileAnimList - 2, false);
    const numTileXparentColors = data.getUint16(
      offsetToTileXparentList - 2,
      false,
    );

    // Parse xlate table
    const xlateTable: number[] = [];
    for (let i = 0; i < numXlateEntries; i++) {
      const offset = offsetToXlateTable + i * 2;
      if (offset + 2 > dataLength) break;
      xlateTable.push(data.getUint16(offset, false));
    }

    // Parse tile attributes (8 bytes each: flags: uint16, parm0: int16, parm1: byte, parm2: byte, padding: 2 bytes)
    const tileAttributes: MightyMikeTileAttribute[] = [];
    for (let i = 0; i < numTileAttributeEntries; i++) {
      const offset = offsetToTileAttributes + i * 8;
      if (offset + 8 > dataLength) break;

      const flags = data.getUint16(offset, false);
      const p0 = data.getInt16(offset + 2, false);
      const p1 = data.getUint8(offset + 4);
      const p2 = data.getUint8(offset + 5);

      tileAttributes.push({
        flags,
        p0,
        p1,
        p2,
        p3: 0,
        p4: 0,
      });
    }

    // Parse tile animations
    const tileAnimations: MightyMikeTileAnimation[] = [];
    let currentOffset = offsetToTileAnimList;

    for (let i = 0; i < numTileAnims; i++) {
      if (currentOffset + 16 > dataLength) break;

      // Read name (pascal string: 1 byte length + up to 15 chars)
      const nameLength = data.getUint8(currentOffset);
      currentOffset += 1;

      const nameBytes = new Uint8Array(
        decompressedBuffer,
        currentOffset,
        Math.min(nameLength, 15),
      );
      const name = new TextDecoder("ascii")
        .decode(nameBytes)
        .replace(/\0/g, "");
      currentOffset += 15; // Fixed size name field

      if (currentOffset + 6 > dataLength) break;

      // Read animation definition
      const speed = data.getUint16(currentOffset, false);
      const baseTile = data.getUint16(currentOffset + 2, false);
      const numFrames = data.getUint16(currentOffset + 4, false);
      currentOffset += 6;

      // Read frame tile numbers
      const tileNums: number[] = [];
      for (let j = 0; j < numFrames; j++) {
        if (currentOffset + 2 > dataLength) break;
        tileNums.push(data.getUint16(currentOffset, false));
        currentOffset += 2;
      }

      tileAnimations.push({
        name,
        speed,
        baseTile,
        numFrames,
        tileNums,
      });
    }

    // Parse transparency colors (used for collision detection, not visual rendering)
    const transparencyColors: number[] = [];
    for (let i = 0; i < numTileXparentColors; i++) {
      const offset = offsetToTileXparentList + i * 2;
      if (offset + 2 > dataLength) break;
      transparencyColors.push(data.getUint16(offset, false));
    }

    // Parse tile images from raw pixel data
    const tileImages = parseTileImages(
      decompressedBuffer,
      offsetToTileDefinitions,
      numTileDefinitions,
      transparencyColors,
      palette,
    );

    const tileset: MightyMikeTileSet = {
      numTileDefinitions,
      numXlateEntries,
      numTileAttributeEntries,
      numTileAnims,
      numTileXparentColors,
      xlateTable,
      tileAttributes,
      tileAnimations,
      transparencyColors,
      tileImages,
    };

  return ok(tileset);
}

export function parseMightyMikeMap(
  buffer: ArrayBuffer,
): Result<MightyMikeMap, string> {
  // Decompress if needed
  const decompressedBuffer = decompressIfNeeded(buffer);
    const data = new DataView(decompressedBuffer);
    const dataLength = decompressedBuffer.byteLength;

    // Parse padding (first 2 bytes)
    const padding = data.getUint16(0, false);

    // Parse header offsets (big-endian 32-bit integers)
    const offsetToMapImage = data.getUint32(2, false);
    const offsetToItemList = data.getUint32(6, false);
    const offsetToAltMap = data.getUint32(10, false);

    // Validate offsets
    if (offsetToMapImage >= dataLength) {
      return err("Invalid map file: map image offset out of bounds");
    }

    // Parse map dimensions (16-bit big-endian)
    const mapWidth = data.getUint16(offsetToMapImage, false);
    const mapHeight = data.getUint16(offsetToMapImage + 2, false);

    // Parse item count
    let numItems = 0;
    if (offsetToItemList > 0 && offsetToItemList + 2 <= dataLength) {
      numItems = data.getUint16(offsetToItemList, false);
    }

    // Parse map image (2D array of 16-bit big-endian integers)
    // From Playfield.h bit definitions:
    // - TILENUM_MASK = 0x07ff (extract only the tile number, bits 0-10)
    // - TILE_PRIORITY_MASK = 0x8000 (collision type flag, bit 15)
    // - TILE_PRIORITY_MASK2 = 0x4000 (pixel-accurate collision flag, bit 14)
    const TILENUM_MASK = 0x07ff;
    const TILE_PRIORITY_MASK = 0x8000;
    const TILE_PRIORITY_MASK2 = 0x4000;
    const mapImage: {
        rawValue: number;
        tileIndex: number;
        hasCollisionMask: boolean;
        usePixelAccurateCollision: boolean;
      }[][] = [];
    const tilesStart = offsetToMapImage + 4; // Skip width/height

    for (let y = 0; y < mapHeight; y++) {
      const row = [];
      for (let x = 0; x < mapWidth; x++) {
        const offset = tilesStart + (y * mapWidth + x) * 2;
        if (offset + 2 > dataLength) {
          // Default tile with no collision flags
          row.push({
            rawValue: 0,
            tileIndex: 0,
            hasCollisionMask: false,
            usePixelAccurateCollision: false,
          });
        } else {
          const rawValue = data.getUint16(offset, false);
          row.push({
            rawValue: rawValue,
            tileIndex: rawValue & TILENUM_MASK,
            hasCollisionMask: (rawValue & TILE_PRIORITY_MASK) !== 0,
            usePixelAccurateCollision: (rawValue & TILE_PRIORITY_MASK2) !== 0,
          });
        }
      }
      mapImage.push(row);
    }

    // Parse items (ObjectEntryType: 14 bytes each)
    const items: MightyMikeItem[] = [];
    if (numItems > 0 && offsetToItemList + 2 + numItems * 14 <= dataLength) {
      const itemsStart = offsetToItemList + 2; // Skip count

      for (let i = 0; i < numItems; i++) {
        const offset = itemsStart + i * 14;
        const x = data.getInt32(offset, false);
        const y = data.getInt32(offset + 4, false);
        const itemType = data.getInt16(offset + 8, false);
        const p0 = data.getUint8(offset + 10);
        const p1 = data.getUint8(offset + 11);
        const p2 = data.getUint8(offset + 12);
        const p3 = data.getUint8(offset + 13);

        items.push({
          x,
          y,
          type: itemType,
          p0,
          p1,
          p2,
          p3,
        });
      }
    }

    // Parse alternate map (byte array, same dimensions)
    let altMap: number[][] | null = null;
    if (
      offsetToAltMap > 0 &&
      offsetToAltMap + mapWidth * mapHeight <= dataLength
    ) {
      altMap = [];
      for (let y = 0; y < mapHeight; y++) {
        const row: number[] = [];
        for (let x = 0; x < mapWidth; x++) {
          const offset = offsetToAltMap + y * mapWidth + x;
          row.push(data.getUint8(offset));
        }
        altMap.push(row);
      }
    }

    const mapData: MightyMikeMap = {
      mapWidth,
      mapHeight,
      numItems,
      mapImage,
      items,
      altMap,
      padding,
    };

  return ok(mapData);
}

/**
 * Parse a complete Mighty Mike level (tileset + map)
 */
export function parseMightyMikeLevel(
  tilesetBuffer: ArrayBuffer,
  mapBuffer: ArrayBuffer,
): Result<MightyMikeLevel, string> {
  const tilesetResult = parseMightyMikeTileSet(tilesetBuffer);
  if (tilesetResult.isErr()) {
    return err(`Tileset error: ${tilesetResult.error}`);
  }

  const mapResult = parseMightyMikeMap(mapBuffer);
  if (mapResult.isErr()) {
    return err(`Map error: ${mapResult.error}`);
  }

  return ok({
    tileset: tilesetResult.value,
    map: mapResult.value,
  });
}

export function mightyMikeMapToBinary(map: MightyMikeMap): ArrayBuffer {
  // Calculate uncompressed buffer size
  const headerSize = 14; // 2 padding + 3 offsets (4 bytes each)
  const mapImageSize = 4 + map.mapWidth * map.mapHeight * 2; // width/height + tile data
  const itemListSize = map.numItems > 0 ? 2 + map.numItems * 14 : 2; // count + items
  const altMapSize = map.altMap ? map.mapWidth * map.mapHeight : 0;

  const totalSize = headerSize + mapImageSize + itemListSize + altMapSize;
  const buffer = new ArrayBuffer(totalSize);
  const data = new DataView(buffer);

  // Calculate offsets
  const offsetToMapImage = headerSize;
  const offsetToItemList = offsetToMapImage + mapImageSize;
  const offsetToAltMap = map.altMap ? offsetToItemList + itemListSize : 0;

  // Write header (first 2 bytes are padding/unused)
  data.setUint16(0, map.padding ?? 0, false); // padding
  data.setUint32(2, offsetToMapImage, false); // offset to map image
  data.setUint32(6, offsetToItemList, false); // offset to item list
  data.setUint32(10, offsetToAltMap, false); // offset to alt map

  // Write map image
  let offset = offsetToMapImage;
  data.setUint16(offset, map.mapWidth, false); // width
  data.setUint16(offset + 2, map.mapHeight, false); // height
  offset += 4;

  // Write tile data (preserving the raw 16-bit values with priority flags)
  for (let y = 0; y < map.mapHeight; y++) {
    for (let x = 0; x < map.mapWidth; x++) {
      const tileValue = map.mapImage[y]?.[x];
      if (!tileValue) {
        // Default to 0 if tile value is missing
        data.setUint16(offset, 0, false);
      } else {
        // Write the raw value which preserves priority/collision bits
        data.setUint16(offset, tileValue.rawValue, false);
      }
      offset += 2;
    }
  }

  // Write item list
  data.setUint16(offsetToItemList, map.numItems, false);
  offset = offsetToItemList + 2;

  for (const item of map.items) {
    data.setInt32(offset, item.x, false);
    data.setInt32(offset + 4, item.y, false);
    data.setInt16(offset + 8, item.type, false);
    data.setUint8(offset + 10, item.p0);
    data.setUint8(offset + 11, item.p1);
    data.setUint8(offset + 12, item.p2);
    data.setUint8(offset + 13, item.p3);
    offset += 14;
  }

  // Write alternate map
  if (map.altMap) {
    offset = offsetToAltMap;
    for (let y = 0; y < map.mapHeight; y++) {
      for (let x = 0; x < map.mapWidth; x++) {
        const altMapValue = map.altMap[y]?.[x] ?? 0;
        data.setUint8(offset, altMapValue);
        offset += 1;
      }
    }
  }

  return buffer;
}

/**
 * Convert map to compressed binary (with RLW compression)
 */
export function mightyMikeMapToCompressedBinary(
  map: MightyMikeMap,
): ArrayBuffer {
  const uncompressed = mightyMikeMapToBinary(map);
  return rlwCompress(uncompressed);
}

export function mightyMikeTileSetToBinary(
  tileset: MightyMikeTileSet,
): ArrayBuffer {
  // This is a complex function that would need to implement the full tileset binary format
  // For now, return an empty buffer as a placeholder
  // TODO: Implement full tileset binary export
  console.log(tileset);
  return new ArrayBuffer(0);
}
