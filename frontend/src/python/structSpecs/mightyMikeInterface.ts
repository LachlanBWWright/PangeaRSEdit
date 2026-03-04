export interface MightyMikeTileSet {
  numTileDefinitions: number;
  numXlateEntries: number;
  numTileAttributeEntries: number;
  numTileAnims: number;
  numTileXparentColors: number;
  xlateTable: number[];
  tileAttributes: MightyMikeTileAttribute[];
  tileAnimations: MightyMikeTileAnimation[];
  transparencyColors: number[];
  tileImages?: HTMLCanvasElement[]; // Optional tile images extracted from tileset
  /** Per-tile collision overlay canvases (orange for solid pixels, transparent for transparent).
   *  Generated at parse time from transparencyColors + raw pixel palette indices. */
  collisionImages?: HTMLCanvasElement[];
}

export interface MightyMikeTileAttribute {
  flags: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
}

export interface MightyMikeTileAnimation {
  name: string;
  speed: number;
  baseTile: number;
  numFrames: number;
  tileNums: number[];
}

/**
 * Tile value bit structure (16-bit):
 * - Bit 15 (0x8000): TILE_PRIORITY_MASK - collision type flag
 * - Bit 14 (0x4000): TILE_PRIORITY_MASK2 - pixel-accurate collision flag
 * - Bits 0-10 (0x07ff): TILENUM_MASK - actual tile index (0-2047)
 */
export interface MightyMikeTileValue {
  /** Raw 16-bit value from the map file (includes priority/collision flags) */
  rawValue: number;
  /** Extracted tile index (0-2047) after applying TILENUM_MASK */
  tileIndex: number;
  /** True if this tile has collision masking enabled (TILE_PRIORITY_MASK bit set) */
  hasCollisionMask: boolean;
  /** True if pixel-accurate collision detection should be used (TILE_PRIORITY_MASK2 bit set) */
  usePixelAccurateCollision: boolean;
}

export interface MightyMikeMap {
  mapWidth: number;
  mapHeight: number;
  numItems: number;
  /** 2D array of tile values with collision flags preserved */
  mapImage: MightyMikeTileValue[][];
  items: MightyMikeItem[];
  altMap: number[][] | null;
  padding?: number; // First 2 bytes of the map file
}

export interface MightyMikeItem {
  x: number;
  y: number;
  type: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
}

export interface MightyMikeLevel {
  tileset: MightyMikeTileSet;
  map: MightyMikeMap;
}
