import { err, ok, type Result } from "neverthrow";
import type {
  MightyMikeTileSet,
  MightyMikeMap,
  MightyMikeTileAttribute,
  MightyMikeTileAnimation,
  MightyMikeItem,
  MightyMikeLevel,
} from "../python/structSpecs/mightyMikeInterface";
import { rlwCompress } from "../utils/rlwDecompress";
import { decompressIfNeeded, parseTileImages } from "./parseMightyMikeHelpers";

export type { MightyMikeMap };

export function parseMightyMikeTileSet(
  buffer: ArrayBuffer,
  palette?: Uint8Array,
): Result<MightyMikeTileSet, string> {
  const decompressedBuffer = decompressIfNeeded(buffer);
  const data = new DataView(decompressedBuffer);
  const dataLength = decompressedBuffer.byteLength;

  const offsetToTileDefinitions = data.getUint32(6, false) + 2; // +2 to skip count word
  const offsetToXlateTable = data.getUint32(10, false) + 2;
  const offsetToTileAttributes = data.getUint32(14, false) + 2;
  const offsetToTileAnimList = data.getUint32(22, false) + 2;
  const offsetToTileXparentList = data.getUint32(26, false) + 2;

  const offsets = [
    { name: "TileDefinitions", value: offsetToTileDefinitions },
    { name: "XlateTable", value: offsetToXlateTable },
    { name: "TileAttributes", value: offsetToTileAttributes },
    { name: "TileAnimList", value: offsetToTileAnimList },
    { name: "TileXparentList", value: offsetToTileXparentList },
  ];

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

  if (
    offsetToTileDefinitions >= dataLength ||
    offsetToXlateTable >= dataLength ||
    offsetToTileAttributes >= dataLength ||
    offsetToTileAnimList >= dataLength ||
    offsetToTileXparentList >= dataLength
  ) {
    return err("Invalid tileset file: offsets out of bounds");
  }

  const numTileDefinitions = data.getUint16(offsetToTileDefinitions - 2, false);
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

  const xlateTable: number[] = [];
  for (let i = 0; i < numXlateEntries; i++) {
    const offset = offsetToXlateTable + i * 2;
    if (offset + 2 > dataLength) break;
    xlateTable.push(data.getUint16(offset, false));
  }

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

  const tileAnimations: MightyMikeTileAnimation[] = [];
  let currentOffset = offsetToTileAnimList;

  for (let i = 0; i < numTileAnims; i++) {
    if (currentOffset + 16 > dataLength) break;

    const nameLength = data.getUint8(currentOffset);
    currentOffset += 1;

    const nameBytes = new Uint8Array(
      decompressedBuffer,
      currentOffset,
      Math.min(nameLength, 15),
    );
    const name = new TextDecoder("ascii").decode(nameBytes).replace(/\0/g, "");
    currentOffset += 15; // Fixed size name field

    if (currentOffset + 6 > dataLength) break;

    const speed = data.getUint16(currentOffset, false);
    const baseTile = data.getUint16(currentOffset + 2, false);
    const numFrames = data.getUint16(currentOffset + 4, false);
    currentOffset += 6;

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

  const transparencyColors: number[] = [];
  for (let i = 0; i < numTileXparentColors; i++) {
    const offset = offsetToTileXparentList + i * 2;
    if (offset + 2 > dataLength) break;
    transparencyColors.push(data.getUint16(offset, false));
  }

  const { tileImages, collisionImages } = parseTileImages(
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
    collisionImages,
  };

  return ok(tileset);
}

export function parseMightyMikeMap(
  buffer: ArrayBuffer,
): Result<MightyMikeMap, string> {
  const decompressedBuffer = decompressIfNeeded(buffer);
  const data = new DataView(decompressedBuffer);
  const dataLength = decompressedBuffer.byteLength;

  const padding = data.getUint16(0, false);

  const offsetToMapImage = data.getUint32(2, false);
  const offsetToItemList = data.getUint32(6, false);
  const offsetToAltMap = data.getUint32(10, false);

  if (offsetToMapImage >= dataLength) {
    return err("Invalid map file: map image offset out of bounds");
  }

  const mapWidth = data.getUint16(offsetToMapImage, false);
  const mapHeight = data.getUint16(offsetToMapImage + 2, false);

  let numItems = 0;
  if (offsetToItemList > 0 && offsetToItemList + 2 <= dataLength) {
    numItems = data.getUint16(offsetToItemList, false);
  }

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
  const headerSize = 14; // 2 padding + 3 offsets (4 bytes each)
  const mapImageSize = 4 + map.mapWidth * map.mapHeight * 2; // width/height + tile data
  const itemListSize = map.numItems > 0 ? 2 + map.numItems * 14 : 2; // count + items
  const altMapSize = map.altMap ? map.mapWidth * map.mapHeight : 0;

  const totalSize = headerSize + mapImageSize + itemListSize + altMapSize;
  const buffer = new ArrayBuffer(totalSize);
  const data = new DataView(buffer);

  const offsetToMapImage = headerSize;
  const offsetToItemList = offsetToMapImage + mapImageSize;
  const offsetToAltMap = map.altMap ? offsetToItemList + itemListSize : 0;

  data.setUint16(0, map.padding ?? 0, false); // padding
  data.setUint32(2, offsetToMapImage, false); // offset to map image
  data.setUint32(6, offsetToItemList, false); // offset to item list
  data.setUint32(10, offsetToAltMap, false); // offset to alt map

  let offset = offsetToMapImage;
  data.setUint16(offset, map.mapWidth, false); // width
  data.setUint16(offset + 2, map.mapHeight, false); // height
  offset += 4;

  for (let y = 0; y < map.mapHeight; y++) {
    for (let x = 0; x < map.mapWidth; x++) {
      const tileValue = map.mapImage[y]?.[x];
      if (!tileValue) {
        data.setUint16(offset, 0, false);
      } else {
        data.setUint16(offset, tileValue.rawValue, false);
      }
      offset += 2;
    }
  }

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
  console.log(tileset);
  return new ArrayBuffer(0);
}
