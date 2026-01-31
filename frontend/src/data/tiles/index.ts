/**
 * Tiles Module
 * 
 * Exports tile structures, data extraction, and selection state for
 * tile-based games (Bugdom 1, Nanosaur 1).
 */

export {
  type TileGameConfig,
  TILE_GAME_CONFIGS,
  TILENUM_MASK,
  TILE_FLIPX_MASK,
  TILE_FLIPY_MASK,
  TILE_FLIPXY_MASK,
  TILE_ROTATE_MASK,
  isTileBasedGame,
  getTileGameConfig,
  extractTileNumber,
  isTileFlippedX,
  isTileFlippedY,
  isTileFlippedXY,
  isTileRotated,
  createTileBits,
} from "./tileStructures";

export {
  type TileInfo,
  type TileUsageStats,
  extractTileInfo,
  getTileUsageStats,
  getTileAtPosition,
  findTilePositions,
  getUnusedTileIndices,
} from "./tileDataExtractor";

export {
  selectedPaletteTileAtom,
  TilePaintMode,
  tilePaintModeAtom,
  showTileGridAtom,
  tileBrushRadiusAtom,
  selectedMapTilesAtom,
  tilePaletteSearchAtom,
  type TileSortOrder,
  tilePaletteSortAtom,
  showUnusedTilesOnlyAtom,
  isTileSelectedAtom,
  resetTileSelectionAtom,
} from "./tileSelectionAtoms";

export {
  type TilePaintResult,
  paintTileAtPosition,
  paintTileBrush,
  floodFillTile,
  pickTileAtPosition,
  replaceAllTiles,
  getSelectedTileRegion,
} from "./tilePaintHandler";

export {
  type TileOptimizationResult,
  analyzeUnusedTiles,
  computeCompactedIndexMapping,
  compactTileIndices,
  validateOptimization,
  getOptimizationStats,
} from "./tileOptimization";
