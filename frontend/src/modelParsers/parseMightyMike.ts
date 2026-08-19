import { err, ok, type Result } from "neverthrow";
import type {
  MightyMikeTileSet,
  MightyMikeMap,
  MightyMikeTileAttribute,
  MightyMikeTileAnimation,
  MightyMikeItem,
  MightyMikeLevel,
} from "../python/structSpecs/mightyMikeInterface";
import { rlbCompress, rlwCompress } from "../utils/rlwDecompress";
import { decompressIfNeeded, parseTileImages } from "./parseMightyMikeHelpers";
import type { LevelIoImagePayload } from "@/data/level-io/levelIoTypes";

export type { MightyMikeMap };

export interface MightyMikeTilesetPreservedData {
  readonly headerPrefixBytes: readonly number[];
  readonly preTileDefinitionBytes: readonly number[];
  readonly legacyPaletteEntryCount: number;
  readonly legacyPaletteBytes: readonly number[];
  readonly animationNameFieldBytes: readonly (readonly number[])[];
  readonly trailingBytes: readonly number[];
}

export interface MightyMikeTilesetWriteInput {
  readonly tileset: MightyMikeTileSet;
  readonly tileImages: readonly LevelIoImagePayload[];
  readonly paletteRgbaBytes: readonly number[];
  readonly tilePaletteIndices?: readonly (readonly number[])[];
  readonly preservedData?: MightyMikeTilesetPreservedData;
}

export function parseMightyMikeTileSet(
  buffer: ArrayBuffer,
  palette?: Uint8Array,
  options?: {
    readonly includeImages?: boolean;
  },
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
    const p3 = data.getUint8(offset + 6);
    const p4 = data.getUint8(offset + 7);

    tileAttributes.push({
      flags,
      p0,
      p1,
      p2,
      p3,
      p4,
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

  const imageResult =
    options?.includeImages === false
      ? { tileImages: undefined, collisionImages: undefined }
      : parseTileImages(
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
    ...(imageResult.tileImages
      ? { tileImages: imageResult.tileImages }
      : {}),
    ...(imageResult.collisionImages
      ? { collisionImages: imageResult.collisionImages }
      : {}),
  };

  return ok(tileset);
}

export function extractMightyMikeTilesetPreservedData(
  buffer: ArrayBuffer,
): Result<MightyMikeTilesetPreservedData, string> {
  const decompressedBuffer = decompressIfNeeded(buffer);
  if (decompressedBuffer.byteLength < 30) {
    return err("Invalid tileset file: header is truncated");
  }
  const data = new DataView(decompressedBuffer);
  const tileDefinitionsOffset = data.getUint32(6, false);
  const legacyPaletteOffset = data.getUint32(18, false);
  const tileAnimationsOffset = data.getUint32(22, false);
  const transparencyOffset = data.getUint32(26, false);
  if (
    tileDefinitionsOffset < 30 ||
    legacyPaletteOffset + 2 > tileAnimationsOffset ||
    tileAnimationsOffset > transparencyOffset ||
    transparencyOffset + 2 > decompressedBuffer.byteLength
  ) {
    return err("Invalid tileset file: preserved section offsets are invalid");
  }
  const animationNameFieldBytes: number[][] = [];
  let animationEntryOffset = tileAnimationsOffset + 2;
  const animationCount = data.getUint16(tileAnimationsOffset, false);
  for (let index = 0; index < animationCount; index += 1) {
    if (animationEntryOffset + 22 > transparencyOffset) {
      return err("Invalid tileset file: animation section is truncated");
    }
    animationNameFieldBytes.push(
      Array.from(new Uint8Array(decompressedBuffer, animationEntryOffset, 16)),
    );
    const frameCount = data.getUint16(animationEntryOffset + 20, false);
    animationEntryOffset += 22 + frameCount * 2;
  }
  return ok({
    headerPrefixBytes: Array.from(new Uint8Array(decompressedBuffer, 0, 6)),
    preTileDefinitionBytes: Array.from(
      new Uint8Array(decompressedBuffer, 30, tileDefinitionsOffset - 30),
    ),
    legacyPaletteEntryCount: data.getUint16(legacyPaletteOffset, false),
    legacyPaletteBytes: Array.from(
      new Uint8Array(
        decompressedBuffer,
        legacyPaletteOffset + 2,
        tileAnimationsOffset - legacyPaletteOffset - 2,
      ),
    ),
    animationNameFieldBytes,
    trailingBytes: Array.from(
      new Uint8Array(
        decompressedBuffer,
        transparencyOffset +
          2 +
          data.getUint16(transparencyOffset, false) * 2,
      ),
    ),
  });
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

function getPaletteIndex(
  rgba: Uint8Array,
  pixelOffset: number,
  palette: Uint8Array,
): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < 256; index += 1) {
    const paletteOffset = index * 4;
    const redDistance = (rgba[pixelOffset] ?? 0) - (palette[paletteOffset] ?? 0);
    const greenDistance =
      (rgba[pixelOffset + 1] ?? 0) - (palette[paletteOffset + 1] ?? 0);
    const blueDistance =
      (rgba[pixelOffset + 2] ?? 0) - (palette[paletteOffset + 2] ?? 0);
    const distance =
      redDistance * redDistance +
      greenDistance * greenDistance +
      blueDistance * blueDistance;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
      if (distance === 0) break;
    }
  }
  return bestIndex;
}

function getAnimationSize(animation: MightyMikeTileAnimation): number {
  return 22 + animation.tileNums.length * 2;
}

function getAnimationNameField(
  animation: MightyMikeTileAnimation,
  preservedField: readonly number[] | undefined,
): Uint8Array {
  const encoder = new TextEncoder();
  if (preservedField?.length === 16) {
    const field = Uint8Array.from(preservedField);
    const length = Math.min(field[0] ?? 0, 15);
    const preservedName = new TextDecoder("ascii")
      .decode(field.slice(1, 1 + length))
      .replace(/\0/g, "");
    if (preservedName === animation.name) return field;
  }
  const name = encoder.encode(animation.name).slice(0, 15);
  const field = new Uint8Array(16);
  field[0] = name.length;
  field.set(name, 1);
  return field;
}

export function mightyMikeTileSetToBinary(
  input: MightyMikeTilesetWriteInput,
): Result<ArrayBuffer, string> {
  const { tileset, tileImages, preservedData } = input;
  if (tileImages.length === 0 || tileImages.length > 0xffff) {
    return err("Mighty Mike tilesets must contain between 1 and 65535 tiles");
  }
  const palette = Uint8Array.from(input.paletteRgbaBytes);
  if (palette.byteLength !== 256 * 4) {
    return err("Mighty Mike tileset export requires a 256-color RGBA palette");
  }
  for (const [index, image] of tileImages.entries()) {
    if (image.width !== 32 || image.height !== 32) {
      return err(`Mighty Mike tile #${index} must be 32x32 pixels`);
    }
    if (image.rgbaBytes.byteLength !== 32 * 32 * 4) {
      return err(`Mighty Mike tile #${index} has invalid RGBA data`);
    }
  }

  const xlateTable = tileset.xlateTable;
  const attributes = tileset.tileAttributes;
  const animations = tileset.tileAnimations;
  const transparencyColors = tileset.transparencyColors;
  if (
    xlateTable.length > 0xffff ||
    attributes.length > 0xffff ||
    animations.length > 0xffff ||
    transparencyColors.length > 0xffff
  ) {
    return err("Mighty Mike tileset section count exceeds 65535 entries");
  }

  const preTileBytes = Uint8Array.from(
    preservedData?.preTileDefinitionBytes ?? [],
  );
  const legacyPaletteBytes = Uint8Array.from(
    preservedData?.legacyPaletteBytes ?? [],
  );
  const headerPrefixBytes = Uint8Array.from(
    preservedData?.headerPrefixBytes ?? [],
  );
  const trailingBytes = Uint8Array.from(preservedData?.trailingBytes ?? []);
  const headerSize = 30;
  const tileDefinitionOffset = headerSize + preTileBytes.byteLength;
  const tileDefinitionSize = 2 + tileImages.length * 32 * 32;
  const xlateOffset = tileDefinitionOffset + tileDefinitionSize;
  const xlateSize = 2 + xlateTable.length * 2;
  const attributeOffset = xlateOffset + xlateSize;
  const attributeSize = 2 + attributes.length * 8;
  const legacyPaletteOffset = attributeOffset + attributeSize;
  const legacyPaletteSize = 2 + legacyPaletteBytes.byteLength;
  const animationOffset = legacyPaletteOffset + legacyPaletteSize;
  const animationSize =
    2 + animations.reduce((total, animation) => total + getAnimationSize(animation), 0);
  const transparencyOffset = animationOffset + animationSize;
  const totalSize =
    transparencyOffset +
    2 +
    transparencyColors.length * 2 +
    trailingBytes.byteLength;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  bytes.set(headerPrefixBytes.slice(0, 6), 0);

  view.setUint32(6, tileDefinitionOffset, false);
  view.setUint32(10, xlateOffset, false);
  view.setUint32(14, attributeOffset, false);
  view.setUint32(18, legacyPaletteOffset, false);
  view.setUint32(22, animationOffset, false);
  view.setUint32(26, transparencyOffset, false);
  bytes.set(preTileBytes, headerSize);

  view.setUint16(tileDefinitionOffset, tileImages.length, false);
  let offset = tileDefinitionOffset + 2;
  for (const [tileIndex, image] of tileImages.entries()) {
    const preservedIndices = input.tilePaletteIndices?.[tileIndex];
    const rgba = new Uint8Array(image.rgbaBytes);
    for (let pixel = 0; pixel < 32 * 32; pixel += 1) {
      bytes[offset] =
        preservedIndices?.length === 32 * 32
          ? (preservedIndices[pixel] ?? 0)
          : getPaletteIndex(rgba, pixel * 4, palette);
      offset += 1;
    }
  }

  view.setUint16(xlateOffset, xlateTable.length, false);
  offset = xlateOffset + 2;
  for (const value of xlateTable) {
    view.setUint16(offset, value, false);
    offset += 2;
  }

  view.setUint16(attributeOffset, attributes.length, false);
  offset = attributeOffset + 2;
  for (const attribute of attributes) {
    view.setUint16(offset, attribute.flags, false);
    view.setInt16(offset + 2, attribute.p0, false);
    view.setUint8(offset + 4, attribute.p1);
    view.setUint8(offset + 5, attribute.p2);
    view.setUint8(offset + 6, attribute.p3);
    view.setUint8(offset + 7, attribute.p4);
    offset += 8;
  }

  view.setUint16(
    legacyPaletteOffset,
    preservedData?.legacyPaletteEntryCount ?? 0,
    false,
  );
  bytes.set(legacyPaletteBytes, legacyPaletteOffset + 2);

  view.setUint16(animationOffset, animations.length, false);
  offset = animationOffset + 2;
  for (const [animationIndex, animation] of animations.entries()) {
    const nameField = getAnimationNameField(
      animation,
      preservedData?.animationNameFieldBytes[animationIndex],
    );
    bytes.set(nameField, offset);
    offset += 16;
    view.setUint16(offset, animation.speed, false);
    view.setUint16(offset + 2, animation.baseTile, false);
    view.setUint16(offset + 4, animation.tileNums.length, false);
    offset += 6;
    for (const tileNumber of animation.tileNums) {
      view.setUint16(offset, tileNumber, false);
      offset += 2;
    }
  }

  view.setUint16(transparencyOffset, transparencyColors.length, false);
  offset = transparencyOffset + 2;
  for (const color of transparencyColors) {
    view.setUint16(offset, color, false);
    offset += 2;
  }
  bytes.set(trailingBytes, offset);
  return ok(rlbCompress(buffer));
}
