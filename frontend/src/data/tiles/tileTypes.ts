/**
 * Types for tile management in tile-based games (Bugdom 1, Billy Frontier, Nanosaur 1)
 */

/**
 * Represents a single tile definition in the tileset
 */
export interface TileDefinition {
  /** Unique ID within the tileset */
  id: number;
  /** Display name */
  name?: string;
  /** Whether this tile is used in the level */
  inUse: boolean;
  /** Number of times this tile appears in the level */
  useCount: number;
}

/**
 * A placed tile on the map with transform properties
 */
export interface PlacedTile {
  /** X coordinate in tiles */
  x: number;
  /** Z coordinate in tiles */
  z: number;
  /** Tile definition ID */
  tileId: number;
  /** Horizontal flip */
  flipH: boolean;
  /** Vertical flip */
  flipV: boolean;
  /** Rotation (0, 90, 180, or 270 degrees) */
  rotation: 0 | 90 | 180 | 270;
}

/**
 * Complete tileset for a level
 */
export interface Tileset {
  /** Game this tileset belongs to */
  game: "bugdom" | "billyFrontier" | "nanosaur";
  /** All tile definitions */
  tiles: TileDefinition[];
  /** Next available tile ID */
  nextId: number;
  /** Tile dimensions in pixels */
  tileWidth: number;
  tileHeight: number;
}

/**
 * Result of a tile operation
 */
export interface TileOpResult<T = void> {
  success: boolean;
  value?: T;
  error?: string;
}
