// mightyMike.ts
// Specs for MightyMike - Note: Parsing is done in TypeScript, not Python
// This file is kept for consistency but actual parsing uses parseMightyMike.ts

export const mightyMikeSpecs = [
  // MightyMike uses different file formats than the 3D terrain games
  // .tileset files contain tile definitions, attributes, animations, transparency
  // .map files contain 2D tile arrays, item lists, alternate maps

  // Note: These specs are for reference only - actual parsing is implemented
  // in TypeScript in parseMightyMike.ts since the formats are complex binary
  // structures with offset-based access that are better handled in TypeScript

  /////////////////////////////////////////////////////////////////
  // TileSet file structure (.tileset)
  /////////////////////////////////////////////////////////////////

  // Header with offsets (big-endian 32-bit integers at specific positions)
  // offsetToTileDefinitions at +6, offsetToXlateTable at +10, etc.

  // Xlate Table (16-bit big-endian integers)
  "XlTb:H+",

  // Tile Attributes (TileAttribType: flags + params)
  "TAtt:HhBBBB+", // flags, p0, p1, p2, p3, p4

  // Tile Animations (complex structure with names and frames)
  // This is handled specially in TypeScript due to variable-length strings

  // Transparency Colors (16-bit big-endian integers)
  "TCol:H+",

  /////////////////////////////////////////////////////////////////
  // Map file structure (.map)
  /////////////////////////////////////////////////////////////////

  // Header with offsets (big-endian 32-bit integers)
  // offsetToMapImage at +2, offsetToItemList at +6, offsetToAltMap at +10

  // Map Image (width, height as 16-bit big-endian, then tile data)
  "MapI:HHH+", // width, height, tiles...

  // Item List (ObjectEntryType structs)
  "Itms:iihBBBB+", // x, y, type, p0, p1, p2, p3

  // Alternate Map (byte array, same size as main map)
  "AltM:B+",
];
