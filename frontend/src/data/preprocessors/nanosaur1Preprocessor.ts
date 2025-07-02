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

import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";
// Convert Nanosaur1LevelData to ottomaticLevel-like structure
// This allows the editor to use Nanosaur 1 levels in the same way as Otto Matic levels
export function nanosaur1LevelToOttoMaticLevel(
  level: Nanosaur1LevelData,
): ottoMaticLevel {
  // Map Nanosaur 1 data to ottoMaticLevel structure
  const width = level.header.width;
  const depth = level.header.depth;

  // Helper for empty record fields
  const emptyRecord = {};

  // Compose ottoMaticLevel object
  const ottoLevel: ottoMaticLevel = {
    Atrb: {
      1000: {
        name: "Tile Attribute Data",
        obj: level.textureAttributes.map((attr) => ({
          bits: attr.bits,
          parm0: attr.parm0,
          parm1: attr.parm1,
          parm2: attr.parm2,
          undefined: attr.undefined,
          // ottoTileAttribute required fields (fill with defaults)
          flags: 0,
          p0: 0,
          p1: 0,
        })),
        order: 0,
      },
    },
    Fenc: {
      1000: {
        name: "Fence List",
        obj: [],
        order: 0,
      },
    },
    FnNb: emptyRecord,
    Timg: {
      1000: {
        name: "Extracted Tile Image Data 32x32/16bit",
        data: "",
        order: 0,
      },
    },
    Hedr: {
      1000: {
        name: "Header",
        obj: {
          version: 1,
          numItems: level.objectList.length,
          mapWidth: width,
          mapHeight: depth,
          numTilePages: 1,
          numTiles: width * depth,
          tileSize: 32,
          minY: 0,
          maxY: 0,
          numSplines: 0,
          numFences: 0,
          numUniqueSupertiles: 0,
          numWaterPatches: 0,
          numCheckpoints: 0,
        },
        order: 0,
      },
    },
    ItCo: {
      1000: {
        name: "Terrain Items Color Array",
        data: "",
        order: 0,
      },
    },
    Itms: {
      1000: {
        name: "Terrain Items List",
        obj: level.objectList.map((item) => ({
          // Map available fields, fill missing ottoItem fields with defaults
          x: item.x,
          y: item.y,
          z: item.y, //TODO: test
          type: item.type,
          parm: item.parm,
          flags: item.flags,
          prevItemIdx: item.prevItemIdx,
          nextItemIdx: item.nextItemIdx,
          // ottoItem required fields (fill with defaults)
          p0: 0,
          p1: 0,
          p2: 0,
          p3: 0,
        })),
        order: 0,
      },
    },
    Layr: {
      1000: {
        name: "Terrain Layer Matrix",
        obj: Array.from(level.textureLayer),
        order: 0,
      },
    },
    Liqd: {
      1000: {
        name: "Water List",
        obj: [],
        order: 0,
      },
    },
    STgd: {
      1000: {
        name: "SuperTile Grid",
        obj: [],
        order: 0,
      },
    },
    SpIt: emptyRecord,
    SpNb: emptyRecord,
    SpPt: emptyRecord,
    Spln: {
      1000: {
        name: "Spline List",
        obj: [],
        order: 0,
      },
    },
    YCrd: {
      1000: {
        name: "Floor&Ceiling Y Coords",
        obj: [],
        order: 0,
      },
    },
    alis: emptyRecord,
    _metadata: {
      file_attributes: 0,
      junk1: 0,
      junk2: 0,
    },
  };

  return ottoLevel;
}

// TypeScript representation of the Nanosaur 1 C struct (TerrainItemEntryType)
export interface TerrainItemEntryType {
  x: number; // UInt16
  y: number; // UInt16
  type: number; // UInt16
  parm: [number, number, number, number]; // Byte[4]
  flags: number; // UInt16
  prevItemIdx: number; // SInt32
  nextItemIdx: number; // SInt32
}

// Level header offsets and info
export interface Nanosaur1LevelHeader {
  textureLayerOffset: number;
  heightmapLayerOffset: number;
  pathLayerOffset: number;
  objectListOffset: number;
  unknown1: number;
  heightmapTilesOffset: number;
  unknown2: number;
  width: number;
  depth: number;
  textureAttribOffset: number;
  tileAnimDataOffset: number;
}

export interface Nanosaur1LevelData {
  header: Nanosaur1LevelHeader;
  textureLayer: Uint16Array;
  heightmapLayer: Uint16Array | null;
  pathLayer: Uint16Array | null;
  objectList: TerrainItemEntryType[];
  textureAttributes: TileAttribType[];
  // Add more fields as needed
}

// TypeScript representation of the Nanosaur 1 C struct (TileAttribType)
export interface TileAttribType {
  bits: number; // UInt16
  parm0: number; // short
  parm1: number; // Byte
  parm2: number; // Byte
  undefined: number; // short
}

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
    const undefined = readInt16BE(view, base + 6);
    items.push({ bits, parm0, parm1, parm2, undefined });
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

  // Texture layer (width * depth, uint16)
  let textureLayer: Uint16Array = new Uint16Array(0);
  if (header.textureLayerOffset > 0) {
    textureLayer = new Uint16Array(
      buffer,
      header.textureLayerOffset,
      header.width * header.depth,
    );
  }

  // Heightmap layer (width * depth, uint16)
  let heightmapLayer: Uint16Array | null = null;
  if (header.heightmapLayerOffset > 0) {
    heightmapLayer = new Uint16Array(
      buffer,
      header.heightmapLayerOffset,
      header.width * header.depth,
    );
  }

  // Path layer (width * depth, uint16)
  let pathLayer: Uint16Array | null = null;
  if (header.pathLayerOffset > 0) {
    pathLayer = new Uint16Array(
      buffer,
      header.pathLayerOffset,
      header.width * header.depth,
    );
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

  // Return all parsed data
  const parsedData = {
    header,
    textureLayer,
    heightmapLayer,
    pathLayer,
    objectList,
    textureAttributes,
  };

  console.log(parsedData);

  return parsedData;
}
