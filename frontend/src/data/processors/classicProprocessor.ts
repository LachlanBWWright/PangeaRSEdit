/*
These are preprocessors for Pangea's older games, Nanosaur 1 and Otto Matic.
Each supertile's texture is constructed from reusable 32x32 tiles, while newer games just use a single compressed texture for each tile.

*/

import { ok, err, type Result } from "neverthrow";
import { canvasDataToSixteenBit } from "@/utils/imageConverter";

// Convert a 32x32 ARGB1555 tile (Uint16Array) to a canvas for display
export function createCanvasFromTile(tile: Uint16Array): HTMLCanvasElement {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < tile.length; i++) {
    const val = tile[i];
    if (val === undefined) continue;
    // ARGB1555 to RGBA8888
    // All nanosaur 1 terrain items have an erroneous alpha value of 0, so ignore and set to 255
    const a = 255;
    const r = ((val >> 10) & 0x1f) << 3;
    const g = ((val >> 5) & 0x1f) << 3;
    const b = (val & 0x1f) << 3;
    imageData.data[i * 4 + 0] = r;
    imageData.data[i * 4 + 1] = g;
    imageData.data[i * 4 + 2] = b;
    imageData.data[i * 4 + 3] = a;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
// Parse Nanosaur 1 terrain tileset (32x32 tiles, 16bpp ARGB1555)
// buffer: ArrayBuffer containing the tileset data
// offset: byte offset to the start of the tileset in the buffer (default 0)
// Returns: Array of Uint16Array (each tile is 32x32, 16bpp)
export function parseNanosaurTerrainTextures(
  buffer: ArrayBuffer,
  offset = 0,
): Uint16Array[] {
  const TILE_SIZE = 32;
  const BYTES_PER_TILE = TILE_SIZE * TILE_SIZE * 2; // 16bpp
  const view = new DataView(buffer, offset);
  const tileCount = view.getInt32(0, false); // big-endian

  const tileDataView = new DataView(buffer, offset + 4);
  return extractTilesFromBuffer(
    tileDataView,
    tileCount,
    TILE_SIZE,
    BYTES_PER_TILE,
  );
}

export function serializeNanosaurTerrainTextures(
  tiles: HTMLCanvasElement[],
): Result<ArrayBuffer, string> {
  const serializedTiles: Uint8Array[] = [];

  for (let i = 0; i < tiles.length; i++) {
    const canvas = tiles[i];
    if (!canvas) {
      return err(`Tile image at index ${i} is missing`);
    }
    if (canvas.width !== 32 || canvas.height !== 32) {
      return err(`Tile image at index ${i} must be 32x32 pixels`);
    }

    const encoded = canvasDataToSixteenBit(canvas);
    if (encoded.isErr()) {
      return err(`Failed to serialize tile image #${i}: ${encoded.error}`);
    }
    serializedTiles.push(new Uint8Array(encoded.value.buffer.slice(0)));
  }

  const totalLength =
    4 + serializedTiles.reduce((sum, tile) => sum + tile.byteLength, 0);
  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);

  view.setInt32(0, tiles.length, false);

  let offset = 4;
  for (const tile of serializedTiles) {
    new Uint8Array(buffer, offset, tile.byteLength).set(tile);
    offset += tile.byteLength;
  }

  return ok(buffer);
}

// Helper to extract Nanosaur 1 tiles from a DataView
export function extractTilesFromBuffer(
  view: DataView,
  tileCount: number,
  TILE_SIZE: number,
  BYTES_PER_TILE: number,
): Uint16Array[] {
  const tiles: Uint16Array[] = [];
  for (let i = 0; i < tileCount; i++) {
    const tileOffset = i * BYTES_PER_TILE; // relative to view
    const tileData = new Uint16Array(TILE_SIZE * TILE_SIZE);
    for (let j = 0; j < TILE_SIZE * TILE_SIZE; j++) {
      // Each pixel is 2 bytes, big-endian
      const pixelOffset = tileOffset + j * 2;
      tileData[j] = view.getUint16(pixelOffset, false); // big-endian
    }
    tiles.push(tileData);
  }
  return tiles;
}

// Parse Nanosaur 1 heightmap tiles (32x32 bytes)
export function parseNanosaurHeightmapTiles(
  buffer: ArrayBuffer,
  tileCount: number,
  offset = 0,
): Uint8Array[] {
  const TILE_SIZE = 32;
  const BYTES_PER_TILE = TILE_SIZE * TILE_SIZE; // 1 byte per pixel
  const view = new DataView(buffer, offset);
  const tiles: Uint8Array[] = [];
  for (let i = 0; i < tileCount; i++) {
    const tileOffset = i * BYTES_PER_TILE; // relative to view
    const tileData = new Uint8Array(BYTES_PER_TILE);
    for (let j = 0; j < BYTES_PER_TILE; j++) {
      tileData[j] = view.getUint8(tileOffset + j);
    }
    tiles.push(tileData);
  }
  return tiles;
}

import {
  nanosaur1LevelToLevelData,
  nanosaur1LevelToOttoMaticLevel,
} from "./classicProprocessorLevelData";
import type {
  Nanosaur1LevelData,
  Nanosaur1LevelHeader,
  TerrainItemEntryType,
  TileAttribType,
} from "./classicProprocessorTypes";

export { nanosaur1LevelToLevelData, nanosaur1LevelToOttoMaticLevel };
export type {
  Nanosaur1LevelData,
  Nanosaur1LevelHeader,
  TerrainItemEntryType,
  TileAttribType,
};

function readInt16BE(view: DataView, offset: number): number {
  return view.getInt16(offset, false);
}
function readUint16BE(view: DataView, offset: number): number {
  return view.getUint16(offset, false);
}
function readInt32BE(view: DataView, offset: number): number {
  return view.getInt32(offset, false);
}

// Parse Nanosaur 1 tile attribute list as in the original C code
export function parseNanosaurTileAttribs(
  buffer: ArrayBuffer,
  itemCount: number,
  offset = 0,
): TileAttribType[] {
  const view = new DataView(buffer, offset);
  const structSize = 8; // Size of TileAttribType struct
  const items: TileAttribType[] = [];
  for (let i = 0; i < itemCount; i++) {
    const base = i * structSize;
    const bits = readUint16BE(view, base);
    const parm0 = readInt16BE(view, base + 2);
    const parm1 = view.getUint8(base + 4);
    const parm2 = view.getUint8(base + 5);
    const undefinedVal = readInt16BE(view, base + 6);
    items.push({ bits, parm0, parm1, parm2, undefined: undefinedVal });
  }
  return items;
}

// Parse Nanosaur 1 terrain item list as in the original C code
export function parseNanosaurTerrainItemList(
  buffer: ArrayBuffer,
  itemCount: number,
  offset = 0,
): TerrainItemEntryType[] {
  const view = new DataView(buffer, offset);
  const structSize = 20; // Updated from 12 to 20
  const items: TerrainItemEntryType[] = [];
  for (let i = 0; i < itemCount; i++) {
    const base = i * structSize;
    const x = readUint16BE(view, base); // Changed to readUint16BE
    const y = readUint16BE(view, base + 2); // Changed to readUint16BE
    const type = readUint16BE(view, base + 4);
    const parm: [number, number, number, number] = [
      view.getUint8(base + 6),
      view.getUint8(base + 7),
      view.getUint8(base + 8),
      view.getUint8(base + 9),
    ];
    const flags = readUint16BE(view, base + 10);
    const prevItemIdx = readInt32BE(view, base + 12);
    const nextItemIdx = readInt32BE(view, base + 16);
    items.push({ x, y, type, flags, parm, prevItemIdx, nextItemIdx });
  }
  return items;
}

// Parse the full Nanosaur 1 level file (see LoadTerrain in C)
export function parseNanosaur1Level(buffer: ArrayBuffer): Nanosaur1LevelData {
  const view = new DataView(buffer);
  // Header: 0-39
  const header: Nanosaur1LevelHeader = {
    textureLayerOffset: readInt32BE(view, 0),
    heightmapLayerOffset: readInt32BE(view, 4),
    pathLayerOffset: readInt32BE(view, 8),
    objectListOffset: readInt32BE(view, 12),
    unknown1: readInt32BE(view, 16),
    heightmapTilesOffset: readInt32BE(view, 20),
    unknown2: readInt32BE(view, 24),
    width: readUint16BE(view, 28),
    depth: readUint16BE(view, 30),
    textureAttribOffset: readInt32BE(view, 32),
    tileAnimDataOffset: readInt32BE(view, 36),
  };

  // Texture layer (width * depth, uint16) - big-endian values
  const textureLayer: number[] = [];
  if (header.textureLayerOffset > 0) {
    const layerView = new DataView(buffer, header.textureLayerOffset);
    const layerSize = header.width * header.depth;
    for (let i = 0; i < layerSize; i++) {
      textureLayer.push(layerView.getUint16(i * 2, false)); // big-endian
    }
  }

  // Heightmap layer (width * depth, uint16) - big-endian values
  let heightmapLayer: number[] | null = null;
  if (header.heightmapLayerOffset > 0) {
    const heightView = new DataView(buffer, header.heightmapLayerOffset);
    const layerSize = header.width * header.depth;
    heightmapLayer = [];
    for (let i = 0; i < layerSize; i++) {
      heightmapLayer.push(heightView.getUint16(i * 2, false)); // big-endian
    }
  }

  // Path layer (width * depth, uint16) - big-endian values
  let pathLayer: number[] | null = null;
  if (header.pathLayerOffset > 0) {
    const pathView = new DataView(buffer, header.pathLayerOffset);
    const layerSize = header.width * header.depth;
    pathLayer = [];
    for (let i = 0; i < layerSize; i++) {
      pathLayer.push(pathView.getUint16(i * 2, false)); // big-endian
    }
  }

  // Object list (TerrainItemEntryType[])
  let objectList: TerrainItemEntryType[] = [];
  if (header.objectListOffset > 0) {
    const objListView = new DataView(buffer, header.objectListOffset);
    const itemCount = objListView.getInt32(0, false); // big-endian
    if (itemCount > 0) {
      objectList = parseNanosaurTerrainItemList(
        buffer,
        itemCount,
        header.objectListOffset + 4,
      );
    }
  }

  // Texture attributes (raw, size = tileAnimDataOffset - textureAttribOffset)
  let textureAttributes: TileAttribType[] = [];
  if (
    header.textureAttribOffset > 0 &&
    header.tileAnimDataOffset > header.textureAttribOffset
  ) {
    const itemCount = Math.floor(
      (header.tileAnimDataOffset - header.textureAttribOffset) / 8,
    );
    textureAttributes = parseNanosaurTileAttribs(
      buffer,
      itemCount,
      header.textureAttribOffset,
    );
  }

  // Heightmap tiles (32x32 bytes each) and padding
  let heightmapTiles: Uint8Array[] | null = null;
  let heightmapPadding: Uint8Array | null = null;

  if (
    header.heightmapTilesOffset > 0 &&
    header.textureAttribOffset > header.heightmapTilesOffset
  ) {
    const HMTILE_SIZE = 32;
    const BYTES_PER_HMTILE = HMTILE_SIZE * HMTILE_SIZE;
    const dataSize = header.textureAttribOffset - header.heightmapTilesOffset;
    const tileCount = Math.floor(dataSize / BYTES_PER_HMTILE);

    if (tileCount > 0) {
      heightmapTiles = parseNanosaurHeightmapTiles(
        buffer,
        tileCount,
        header.heightmapTilesOffset,
      );
    }

    // Check for padding/extra bytes
    const consumedBytes = tileCount * BYTES_PER_HMTILE;
    if (consumedBytes < dataSize) {
      const paddingSize = dataSize - consumedBytes;
      const paddingOffset = header.heightmapTilesOffset + consumedBytes;
      // slice of ArrayBuffer
      const paddingBuffer = buffer.slice(
        paddingOffset,
        paddingOffset + paddingSize,
      );
      heightmapPadding = new Uint8Array(paddingBuffer);
    }
  }

  // Tile Anim Data (from offset to EOF)
  let tileAnimData: Uint8Array | null = null;
  if (
    header.tileAnimDataOffset > 0 &&
    header.tileAnimDataOffset < buffer.byteLength
  ) {
    const animSize = buffer.byteLength - header.tileAnimDataOffset;
    const animOffset = header.tileAnimDataOffset;
    const animBuffer = buffer.slice(animOffset, animOffset + animSize);
    tileAnimData = new Uint8Array(animBuffer);
  }

  // Return all parsed data
  return {
    header,
    textureLayer,
    heightmapLayer,
    pathLayer,
    objectList,
    textureAttributes,
    heightmapTiles: heightmapTiles,
    heightmapPadding: heightmapPadding,
    tileAnimData: tileAnimData,
  };
}
