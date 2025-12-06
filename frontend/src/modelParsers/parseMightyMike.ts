// parseMightyMike.ts
// TypeScript parser for MightyMike .map and .tileset files

import type { Result, ResultOk, ResultErr } from "../types/result";
import type {
  MightyMikeTileSet,
  MightyMikeMap,
  MightyMikeLevel,
  MightyMikeTileAttribute,
  MightyMikeTileAnimation,
  MightyMikeItem,
} from "../python/structSpecs/mightyMikeInterface";

export function parseMightyMikeTileSet(
  buffer: ArrayBuffer,
): Result<MightyMikeTileSet, string> {
  try {
    const data = new DataView(buffer);
    const dataLength = buffer.byteLength;

    // Parse header offsets (big-endian 32-bit integers)
    const offsetToTileDefinitions = data.getUint32(6, false) + 2; // +2 to skip count word
    const offsetToXlateTable = data.getUint32(10, false) + 2;
    const offsetToTileAttributes = data.getUint32(14, false) + 2;
    const offsetToTileAnimList = data.getUint32(22, false) + 2;
    const offsetToTileXparentList = data.getUint32(26, false) + 2;

    // Validate offsets are within bounds
    if (
      offsetToTileDefinitions >= dataLength ||
      offsetToXlateTable >= dataLength ||
      offsetToTileAttributes >= dataLength ||
      offsetToTileAnimList >= dataLength ||
      offsetToTileXparentList >= dataLength
    ) {
      return {
        ok: false,
        error: "Invalid tileset file: offsets out of bounds",
      };
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

    // Parse tile attributes (4 bytes each: flags: uint16, p0: int16)
    const tileAttributes: MightyMikeTileAttribute[] = [];
    for (let i = 0; i < numTileAttributeEntries; i++) {
      const offset = offsetToTileAttributes + i * 4;
      if (offset + 4 > dataLength) break;

      const flags = data.getUint16(offset, false);
      const p0 = data.getInt16(offset + 2, false);

      tileAttributes.push({
        flags,
        p0,
        p1: 0, // Placeholder - struct may need verification
        p2: 0,
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
        buffer,
        currentOffset,
        Math.min(nameLength, 15),
      );
      const name = new TextDecoder("ascii")
        .decode(nameBytes)
        .replace(/\0/g, "");
      currentOffset += 16; // Skip to fixed size including padding

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
        tile_nums: tileNums,
      });
    }

    // Parse transparency colors
    const transparencyColors: number[] = [];
    for (let i = 0; i < numTileXparentColors; i++) {
      const offset = offsetToTileXparentList + i * 2;
      if (offset + 2 > dataLength) break;
      transparencyColors.push(data.getUint16(offset, false));
    }

    const tileset: MightyMikeTileSet = {
      num_tile_definitions: numTileDefinitions,
      num_xlate_entries: numXlateEntries,
      num_tile_attribute_entries: numTileAttributeEntries,
      num_tile_anims: numTileAnims,
      num_tile_xparent_colors: numTileXparentColors,
      xlate_table: xlateTable,
      tile_attributes: tileAttributes,
      tile_animations: tileAnimations,
      transparency_colors: transparencyColors,
    };

    return { ok: true, value: tileset };
  } catch (error) {
    return { ok: false, error: `Failed to parse tileset: ${error}` };
  }
}

export function parseMightyMikeMap(
  buffer: ArrayBuffer,
): Result<MightyMikeMap, string> {
  try {
    const data = new DataView(buffer);
    const dataLength = buffer.byteLength;

    // Parse header offsets (big-endian 32-bit integers)
    const offsetToMapImage = data.getUint32(2, false);
    const offsetToItemList = data.getUint32(6, false);
    const offsetToAltMap = data.getUint32(10, false);

    // Validate offsets
    if (offsetToMapImage >= dataLength) {
      return {
        ok: false,
        error: "Invalid map file: map image offset out of bounds",
      };
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
    const mapImage: number[][] = [];
    const tilesStart = offsetToMapImage + 4; // Skip width/height

    for (let y = 0; y < mapHeight; y++) {
      const row: number[] = [];
      for (let x = 0; x < mapWidth; x++) {
        const offset = tilesStart + (y * mapWidth + x) * 2;
        if (offset + 2 > dataLength) {
          row.push(0); // Default tile
        } else {
          row.push(data.getUint16(offset, false));
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
      map_width: mapWidth,
      map_height: mapHeight,
      num_items: numItems,
      map_image: mapImage,
      items,
      alt_map: altMap,
    };

    return { ok: true, value: mapData };
  } catch (error) {
    return { ok: false, error: `Failed to parse map: ${error}` };
  }
}

export function mightyMikeMapToBinary(map: MightyMikeMap): ArrayBuffer {
  // Calculate buffer size
  const headerSize = 14; // 3 offsets (4 bytes each) + 2 padding
  const mapImageSize = 4 + map.map_width * map.map_height * 2; // width/height + tile data
  const itemListSize = map.num_items > 0 ? 2 + map.num_items * 14 : 0; // count + items
  const altMapSize = map.alt_map ? map.map_width * map.map_height : 0;

  const totalSize = headerSize + mapImageSize + itemListSize + altMapSize;
  const buffer = new ArrayBuffer(totalSize);
  const data = new DataView(buffer);

  // Calculate offsets
  const offsetToMapImage = headerSize;
  const offsetToItemList = offsetToMapImage + mapImageSize;
  const offsetToAltMap = map.alt_map ? offsetToItemList + itemListSize : 0;

  // Write header offsets (big-endian)
  data.setUint32(2, offsetToMapImage, false); // offset to map image
  data.setUint32(6, offsetToItemList, false); // offset to item list
  data.setUint32(10, offsetToAltMap, false); // offset to alt map

  // Write map image
  let offset = offsetToMapImage;
  data.setUint16(offset, map.map_width, false); // width
  data.setUint16(offset + 2, map.map_height, false); // height
  offset += 4;

  // Write tile data
  for (let y = 0; y < map.map_height; y++) {
    for (let x = 0; x < map.map_width; x++) {
      data.setUint16(offset, map.map_image[y][x], false);
      offset += 2;
    }
  }

  // Write item list
  if (map.num_items > 0) {
    data.setUint16(offsetToItemList, map.num_items, false);
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
  }

  // Write alternate map
  if (map.alt_map) {
    offset = offsetToAltMap;
    for (let y = 0; y < map.map_height; y++) {
      for (let x = 0; x < map.map_width; x++) {
        data.setUint8(offset, map.alt_map[y][x]);
        offset += 1;
      }
    }
  }

  return buffer;
}

export function mightyMikeTileSetToBinary(
  tileset: MightyMikeTileSet,
): ArrayBuffer {
  // This is a complex function that would need to implement the full tileset binary format
  // For now, return an empty buffer as a placeholder
  // TODO: Implement full tileset binary export
  return new ArrayBuffer(0);
}
