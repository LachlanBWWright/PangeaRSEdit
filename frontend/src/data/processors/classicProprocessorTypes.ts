/** One terrain item entry in a classic level file. */
export interface TerrainItemEntryType {
  x: number;
  y: number;
  type: number;
  parm: [number, number, number, number];
  flags: number;
  prevItemIdx: number;
  nextItemIdx: number;
}

/** Header structure for a classic Nanosaur 1 level. */
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

/** Tile attribute structure used by classic terrain data. */
export interface TileAttribType {
  bits: number;
  parm0: number;
  parm1: number;
  parm2: number;
  undefined: number;
}

/** Fully parsed Nanosaur 1 level payload. */
export interface Nanosaur1LevelData {
  header: Nanosaur1LevelHeader;
  textureLayer: number[];
  heightmapLayer: number[] | null;
  pathLayer: number[] | null;
  heightmapTiles?: Uint8Array[] | null;
  objectList: TerrainItemEntryType[];
  textureAttributes: TileAttribType[];
  heightmapPadding?: Uint8Array | null;
  tileAnimData?: Uint8Array | null;
}
