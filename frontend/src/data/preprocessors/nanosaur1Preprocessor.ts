// Convert Nanosaur1LevelData to ottomaticLevel-like structure
// This allows the editor to use Nanosaur 1 levels in the same way as Otto Matic levels
export function nanosaur1LevelToOttoMaticLevel(level: Nanosaur1LevelData) {
  // OttoMaticLevel expects a structure with keys like Hedr, Layr, Atrb, Itms, etc.
  // We'll map Nanosaur 1's data to a similar structure
  const width = level.header.width;
  const depth = level.header.depth;
  // Layr: texture layer (tile indices)
  const Layr = {
    1000: {
      obj: Array.from(level.textureLayer),
      width,
      height: depth,
    },
  };
  // Atrb: texture attributes (raw, not parsed here)
  const Atrb = {
    1000: {
      obj: new Uint8Array(level.textureAttributes),
      width,
      height: depth,
    },
  };
  // Itms: terrain items (object list)
  const Itms = {
    1000: {
      obj: level.objectList,
    },
  };
  // Hedr: header info
  const Hedr = {
    1000: {
      obj: {
        width,
        height: depth,
        numItems: level.objectList.length,
        // Add more fields as needed
      },
    },
  };
  // Height: heightmap layer
  const Heig = level.heightmapLayer
    ? {
        1000: {
          obj: Array.from(level.heightmapLayer),
          width,
          height: depth,
        },
      }
    : undefined;
  // Path: path layer
  const Path = level.pathLayer
    ? {
        1000: {
          obj: Array.from(level.pathLayer),
          width,
          height: depth,
        },
      }
    : undefined;

  // Compose ottomaticLevel-like object
  const ottomaticLevel = {
    Hedr,
    Layr,
    Atrb,
    Itms,
    Heig,
    Path,
    // Add more fields as needed for compatibility
  };
  return ottomaticLevel;
}


// TypeScript representation of the Nanosaur 1 C struct (TerrainItemEntryType)
export interface TerrainItemEntryType {
  x: number;         // int16_t
  y: number;         // int16_t
  type: number;      // uint16_t
  flags: number;     // uint16_t
  parm: [number, number, number, number]; // uint8_t[4]
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
  textureAttributes: ArrayBuffer;
  // Add more fields as needed
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

// Parse Nanosaur 1 terrain item list as in the original C code
export function parseNanosaurTerrainItemList(
  buffer: ArrayBuffer,
  itemCount: number,
  offset = 0
): TerrainItemEntryType[] {
  const view = new DataView(buffer, offset);
  const structSize = 12;
  const items: TerrainItemEntryType[] = [];
  for (let i = 0; i < itemCount; i++) {
    const base = i * structSize;
    const x = readInt16BE(view, base);
    const y = readInt16BE(view, base + 2);
    const type = readUint16BE(view, base + 4);
    const flags = readUint16BE(view, base + 6);
    const parm: [number, number, number, number] = [
      view.getUint8(base + 8),
      view.getUint8(base + 9),
      view.getUint8(base + 10),
      view.getUint8(base + 11),
    ];
    items.push({ x, y, type, flags, parm });
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
    width: readInt16BE(view, 28),
    depth: readInt16BE(view, 30),
    textureAttribOffset: readInt32BE(view, 32),
    tileAnimDataOffset: readInt32BE(view, 36),
  };

  // Texture layer (width * depth, uint16)
  let textureLayer: Uint16Array = new Uint16Array(0);
  if (header.textureLayerOffset > 0) {
    textureLayer = new Uint16Array(
      buffer,
      header.textureLayerOffset,
      header.width * header.depth
    );
  }

  // Heightmap layer (width * depth, uint16)
  let heightmapLayer: Uint16Array | null = null;
  if (header.heightmapLayerOffset > 0) {
    heightmapLayer = new Uint16Array(
      buffer,
      header.heightmapLayerOffset,
      header.width * header.depth
    );
  }

  // Path layer (width * depth, uint16)
  let pathLayer: Uint16Array | null = null;
  if (header.pathLayerOffset > 0) {
    pathLayer = new Uint16Array(
      buffer,
      header.pathLayerOffset,
      header.width * header.depth
    );
  }

  // Object list (TerrainItemEntryType[])
  let objectList: TerrainItemEntryType[] = [];
  if (header.objectListOffset > 0) {
    // Guess item count: (textureAttribOffset - objectListOffset) / 12
    let itemCount = 0;
    if (header.textureAttribOffset > header.objectListOffset) {
      itemCount = Math.floor(
        (header.textureAttribOffset - header.objectListOffset) / 12
      );
    }
    objectList = parseNanosaurTerrainItemList(
      buffer,
      itemCount,
      header.objectListOffset
    );
  }

  // Texture attributes (raw, size = tileAnimDataOffset - textureAttribOffset)
  let textureAttributes: ArrayBuffer = new ArrayBuffer(0);
  if (
    header.textureAttribOffset > 0 &&
    header.tileAnimDataOffset > header.textureAttribOffset
  ) {
    textureAttributes = buffer.slice(
      header.textureAttribOffset,
      header.tileAnimDataOffset
    );
  }

  // Return all parsed data
  return {
    header,
    textureLayer,
    heightmapLayer,
    pathLayer,
    objectList,
    textureAttributes,
  };
}