import { describe, it, expect } from 'vitest';
import {
  addSupertileRow,
  removeSupertileRow,
  addSupertileColumn,
  removeSupertileColumn,
  supertileCoordsToIndex,
  supertileIndexToCoords,
  tileCoordsToIndex,
  tileIndexToCoords,
  createBlankSupertile,
  createBlankTileAttribute,
  addBlankSupertileTextures,
  Side
} from './supertileOperations';
import { ottoMaticLevel } from '../python/structSpecs/ottoMaticInterface';
import { OttoGlobals } from '../data/globals/globals';

// Helper function to create a minimal test level data
function createTestLevel(mapWidth: number, mapHeight: number): ottoMaticLevel {
  const tilesCount = mapWidth * mapHeight;
  const supertilesWide = mapWidth / OttoGlobals.TILES_PER_SUPERTILE;
  const supertilesHigh = mapHeight / OttoGlobals.TILES_PER_SUPERTILE;
  const supertilesCount = supertilesWide * supertilesHigh;

  return {
    Hedr: {
      1000: {
        name: "Header",
        obj: {
          version: 1,
          numItems: 0,
          mapWidth,
          mapHeight,
          numTilePages: 0,
          numTiles: tilesCount,
          tileSize: 16,
          minY: 0,
          maxY: 100,
          numSplines: 0,
          numFences: 0,
          numUniqueSupertiles: supertilesCount,
          numWaterPatches: 0,
          numCheckpoints: 0,
        },
        order: 0,
      },
    },
    STgd: {
      1000: {
        name: "SuperTile Grid",
        obj: Array.from({ length: supertilesCount }, (_, i) => ({
          padByte: "",
          isEmpty: false,
          superTileId: i + 1,
        })),
        order: 43,
      },
    },
    Atrb: {
      1000: {
        name: "Tile Attribute Data",
        obj: Array.from({ length: tilesCount }, () => ({
          flags: 0,
          p0: 0,
          p1: 0,
        })),
        order: 40,
      },
    },
    Layr: {
      1000: {
        name: "Terrain Layer Matrix",
        obj: Array.from({ length: tilesCount }, () => 0),
        order: 41,
      },
    },
    YCrd: {
      1000: {
        name: "Floor&Ceiling Y Coords",
        obj: Array.from({ length: (mapWidth + 1) * (mapHeight + 1) }, () => 0),
        order: 42,
      },
    },
    alis: {},
    ItCo: {
      1000: {
        name: "Terrain Items Color Array",
        data: "",
        order: 99,
      },
    },
    _metadata: {
      file_attributes: 0,
      junk1: 0,
      junk2: 0,
    },
  };
}

describe('Coordinate conversion utilities', () => {
  it('should convert supertile coordinates to index correctly', () => {
    expect(supertileCoordsToIndex(0, 0, 4)).toBe(0);
    expect(supertileCoordsToIndex(1, 0, 4)).toBe(1);
    expect(supertileCoordsToIndex(0, 1, 4)).toBe(4);
    expect(supertileCoordsToIndex(2, 1, 4)).toBe(6);
  });

  it('should convert supertile index to coordinates correctly', () => {
    expect(supertileIndexToCoords(0, 4)).toEqual({ x: 0, y: 0 });
    expect(supertileIndexToCoords(1, 4)).toEqual({ x: 1, y: 0 });
    expect(supertileIndexToCoords(4, 4)).toEqual({ x: 0, y: 1 });
    expect(supertileIndexToCoords(6, 4)).toEqual({ x: 2, y: 1 });
  });

  it('should convert tile coordinates to index correctly', () => {
    expect(tileCoordsToIndex(0, 0, 16)).toBe(0);
    expect(tileCoordsToIndex(1, 0, 16)).toBe(1);
    expect(tileCoordsToIndex(0, 1, 16)).toBe(16);
    expect(tileCoordsToIndex(8, 1, 16)).toBe(24);
  });

  it('should convert tile index to coordinates correctly', () => {
    expect(tileIndexToCoords(0, 16)).toEqual({ x: 0, y: 0 });
    expect(tileIndexToCoords(1, 16)).toEqual({ x: 1, y: 0 });
    expect(tileIndexToCoords(16, 16)).toEqual({ x: 0, y: 1 });
    expect(tileIndexToCoords(24, 16)).toEqual({ x: 8, y: 1 });
  });
});

describe('Blank data creation utilities', () => {
  it('should create blank supertile with correct properties', () => {
    const blank = createBlankSupertile();
    expect(blank.padByte).toBe("");
    expect(blank.isEmpty).toBe(true);
    expect(blank.superTileId).toBe(0);
  });

  it('should create blank tile attribute with correct properties', () => {
    const blank = createBlankTileAttribute();
    expect(blank.flags).toBe(0);
    expect(blank.p0).toBe(0);
    expect(blank.p1).toBe(0);
  });

  it('should add blank supertile textures correctly', () => {
    const originalImages: HTMLCanvasElement[] = [];
    const newImages = addBlankSupertileTextures(originalImages, 2, OttoGlobals);
    
    expect(newImages).toHaveLength(2);
    expect(newImages[0]).toBeInstanceOf(HTMLCanvasElement);
    expect(newImages[0].width).toBe(OttoGlobals.SUPERTILE_TEXMAP_SIZE);
    expect(newImages[0].height).toBe(OttoGlobals.SUPERTILE_TEXMAP_SIZE);
  });
});

describe('Add supertile row operations', () => {
  it('should add a row to the top correctly', () => {
    // Start with a 2x2 supertile grid (16x16 tiles)
    const originalLevel = createTestLevel(16, 16);
    const result = addSupertileRow(originalLevel, Side.TOP, OttoGlobals);

    // Should now be 16x24 tiles (2x3 supertiles)
    expect(result.Hedr[1000].obj.mapHeight).toBe(24);
    expect(result.Hedr[1000].obj.mapWidth).toBe(16);
    
    // Should have 6 supertiles (2 wide x 3 high)
    expect(result.STgd[1000].obj).toHaveLength(6);
    
    // Should have 384 tiles (16 x 24)
    expect(result.Atrb[1000].obj).toHaveLength(384);
    expect(result.Layr[1000].obj).toHaveLength(384);
    
    // YCrd should have (width+1) * (height+1) entries for vertices
    expect(result.YCrd[1000].obj).toHaveLength((16 + 1) * (24 + 1)); // 17 * 25 = 425
    
    // First 2 supertiles should be blank (new row at top)
    expect(result.STgd[1000].obj[0].isEmpty).toBe(true);
    expect(result.STgd[1000].obj[1].isEmpty).toBe(true);
    
    // Last 4 supertiles should be from original data
    expect(result.STgd[1000].obj[2].superTileId).toBe(1);
    expect(result.STgd[1000].obj[3].superTileId).toBe(2);
  });

  it('should add a row to the bottom correctly', () => {
    const originalLevel = createTestLevel(16, 16);
    const result = addSupertileRow(originalLevel, Side.BOTTOM, OttoGlobals);

    expect(result.Hedr[1000].obj.mapHeight).toBe(24);
    expect(result.STgd[1000].obj).toHaveLength(6);
    
    // First 4 supertiles should be from original data
    expect(result.STgd[1000].obj[0].superTileId).toBe(1);
    expect(result.STgd[1000].obj[1].superTileId).toBe(2);
    
    // Last 2 supertiles should be blank (new row at bottom)
    expect(result.STgd[1000].obj[4].isEmpty).toBe(true);
    expect(result.STgd[1000].obj[5].isEmpty).toBe(true);
  });
});

describe('Add supertile column operations', () => {
  it('should add a column to the left correctly', () => {
    // Start with a 2x2 supertile grid (16x16 tiles)
    const originalLevel = createTestLevel(16, 16);
    const result = addSupertileColumn(originalLevel, Side.LEFT, OttoGlobals);

    // Should now be 24x16 tiles (3x2 supertiles)
    expect(result.Hedr[1000].obj.mapWidth).toBe(24);
    expect(result.Hedr[1000].obj.mapHeight).toBe(16);
    
    // Should have 6 supertiles (3 wide x 2 high)
    expect(result.STgd[1000].obj).toHaveLength(6);
    
    // Should have 384 tiles (24 x 16)
    expect(result.Atrb[1000].obj).toHaveLength(384);
    
    // First supertile of each row should be blank
    expect(result.STgd[1000].obj[0].isEmpty).toBe(true); // Row 0, Col 0
    expect(result.STgd[1000].obj[3].isEmpty).toBe(true); // Row 1, Col 0
  });

  it('should add a column to the right correctly', () => {
    const originalLevel = createTestLevel(16, 16);
    const result = addSupertileColumn(originalLevel, Side.RIGHT, OttoGlobals);

    expect(result.Hedr[1000].obj.mapWidth).toBe(24);
    expect(result.STgd[1000].obj).toHaveLength(6);
    
    // Last supertile of each row should be blank
    expect(result.STgd[1000].obj[2].isEmpty).toBe(true); // Row 0, Col 2
    expect(result.STgd[1000].obj[5].isEmpty).toBe(true); // Row 1, Col 2
  });
});

describe('Remove supertile row operations', () => {
  it('should remove a row from the top correctly', () => {
    // Start with a 2x3 supertile grid (16x24 tiles)
    const originalLevel = createTestLevel(16, 24);
    const result = removeSupertileRow(originalLevel, Side.TOP, OttoGlobals);

    // Should now be 16x16 tiles (2x2 supertiles)
    expect(result.Hedr[1000].obj.mapHeight).toBe(16);
    expect(result.STgd[1000].obj).toHaveLength(4);
    expect(result.Atrb[1000].obj).toHaveLength(256);
  });

  it('should remove a row from the bottom correctly', () => {
    const originalLevel = createTestLevel(16, 24);
    const result = removeSupertileRow(originalLevel, Side.BOTTOM, OttoGlobals);

    expect(result.Hedr[1000].obj.mapHeight).toBe(16);
    expect(result.STgd[1000].obj).toHaveLength(4);
  });

  it('should throw error when trying to remove last row', () => {
    const originalLevel = createTestLevel(8, 8); // Only 1 supertile row
    
    expect(() => {
      removeSupertileRow(originalLevel, Side.TOP, OttoGlobals);
    }).toThrow("Cannot remove row: map must have at least one supertile row");
  });
});

describe('Remove supertile column operations', () => {
  it('should remove a column from the left correctly', () => {
    // Start with a 3x2 supertile grid (24x16 tiles)
    const originalLevel = createTestLevel(24, 16);
    const result = removeSupertileColumn(originalLevel, Side.LEFT, OttoGlobals);

    // Should now be 16x16 tiles (2x2 supertiles)
    expect(result.Hedr[1000].obj.mapWidth).toBe(16);
    expect(result.STgd[1000].obj).toHaveLength(4);
    expect(result.Atrb[1000].obj).toHaveLength(256);
  });

  it('should remove a column from the right correctly', () => {
    const originalLevel = createTestLevel(24, 16);
    const result = removeSupertileColumn(originalLevel, Side.RIGHT, OttoGlobals);

    expect(result.Hedr[1000].obj.mapWidth).toBe(16);
    expect(result.STgd[1000].obj).toHaveLength(4);
  });

  it('should throw error when trying to remove last column', () => {
    const originalLevel = createTestLevel(8, 8); // Only 1 supertile column
    
    expect(() => {
      removeSupertileColumn(originalLevel, Side.LEFT, OttoGlobals);
    }).toThrow("Cannot remove column: map must have at least one supertile column");
  });
});