# Creating Blank Levels for All Games

## Overview

This plan describes implementing the ability to create blank/empty levels for all supported Pangea games, without requiring an existing level file as a template. This allows users to start fresh level design from scratch.

## Problem Statement

Currently, the editor requires loading an existing level file to begin editing. There is no "New Level" functionality that would create a blank, editable level. Users must:

1. Have access to existing game level files
2. Modify existing levels rather than create new ones
3. Cannot easily test the editor without game data

## Goals

1. Create blank level templates for each supported game
2. Allow users to specify level dimensions and basic parameters
3. Generate valid level data structures that pass game validation
4. Support all terrain features (tiles, items, splines, fences, water bodies)
5. Integrate with existing save/export functionality

---

## Phase 1: Analyze Level Requirements

### 1.1 Game-Specific Level Structures

Each game has different requirements for a valid level file. Configuration data is already defined in
`frontend/src/data/globals/globals.ts` which provides key parameters:

| Game | DataType | TileFormat | SupertileSize | TilesPerSupertile | TileIngameSize |
|------|----------|------------|---------------|-------------------|----------------|
| Otto Matic | STANDARD | LZSS_16_BIT | 128 | 8 | 225.0 |
| Bugdom 2 | STANDARD | LZSS_16_BIT | 128 | 8 | 225.0 |
| Bugdom 1 | RSRC_FORK | LZSS_16_BIT | 160 | 5 | 160.0 |
| Nanosaur 1 | TRT_FILE | LZSS_16_BIT | 160 | 5 | 140.0 |
| Nanosaur 2 | STANDARD | JPG | 256 | 8 | 210.0 |
| Cro-Mag Rally | STANDARD | LZSS_16_BIT | 128 | 8 | 800.0 |
| Billy Frontier | STANDARD | LZSS_16_BIT | 256 | 8 | 125.0 |
| Mighty Mike | MIGHTY_MIKE | LZSS_16_BIT | 32 | 1 | 32.0 |

#### Otto Matic
- Header with standard fields (from `OttoMaticHeader` type)
- Supertile grid (8x8 tiles per supertile)
- Terrain height data (YCrd)
- Tile attributes (Atrb)
- Item color array (ItCo)
- Optional: Fences, Splines, Water bodies
- Supertile textures (alis/Timg)

#### Bugdom 2
- Similar to Otto Matic
- Different item types (`bugdom2ItemTypeNames`)
- Different fence types (`bugdom2FenceTypeNames`)
- Different water body types

#### Bugdom 1
- Uses resource fork format (DataType.RSRC_FORK)
- Individual 32x32 tiles instead of supertiles
- 5x5 tiles per supertile (SUPERTILE_SIZE = 5)
- Floor AND Roof terrain (two YCrd arrays: 1000 and 1001)
- Extended tile attribute structure (`BugdomTileAttribute`)

#### Nanosaur 1
- TRT file format (DataType.TRT_FILE)
- Individual 32x32 tiles
- 5x5 tiles per supertile
- Simplified structure - no fences, water, or splines

#### Nanosaur 2
- JPG texture format (TileImageFormat.JPG)
- 8x8 tiles per supertile
- 256x256 supertile textures
- Standard header structure

#### Cro-Mag Rally
- Uses numPaths instead of numWaterPatches in header
- Racing track specific items
- Checkpoint system
- TILE_INGAME_SIZE = 800.0 (largest scale)

#### Billy Frontier
- 256x256 supertile textures
- Scene-based levels (shootout, duel, stampede)
- Open splines (non-circular) - covered in Plan 004

#### Mighty Mike
- 2D tilemap, not 3D terrain (DataType.MIGHTY_MIKE)
- .tileset and .map files
- Direct tile mapping (TILES_PER_SUPERTILE = 1)
- No fences, water, or splines

### 1.2 Minimum Valid Level Requirements

**File:** `frontend/src/data/levelTemplates/levelRequirements.ts`

```typescript
import { Game, GlobalsInterface } from "@/data/globals/globals";

export interface LevelRequirements {
  game: Game;
  
  // Dimensions
  minMapWidth: number;
  maxMapWidth: number;
  minMapHeight: number;
  maxMapHeight: number;
  
  // Required sections
  requiresHeader: boolean;
  requiresYCrd: boolean;
  requiresAtrb: boolean;
  requiresLayr: boolean;
  requiresItCo: boolean;
  requiresSTgd: boolean;  // Supertile grid
  requiresXlat: boolean;  // Translation table (tile games)
  requiresTimg: boolean;  // Tile image data
  
  // Optional sections
  supportsFences: boolean;
  supportsSplines: boolean;
  supportsWater: boolean;
  supportsRoof: boolean;  // Bugdom 1 dual terrain
  supportsCheckpoints: boolean;
  
  // Constraints
  tilesPerSupertile: number;
  supertileTextureSize: number;
  defaultTerrainHeight: number;
}

export const LEVEL_REQUIREMENTS: Record<Game, LevelRequirements> = {
  [Game.OTTO_MATIC]: {
    game: Game.OTTO_MATIC,
    minMapWidth: 16,
    maxMapWidth: 512,
    minMapHeight: 16,
    maxMapHeight: 512,
    requiresHeader: true,
    requiresYCrd: true,
    requiresAtrb: true,
    requiresLayr: true,
    requiresItCo: true,
    requiresSTgd: true,
    requiresXlat: false,
    requiresTimg: true,
    supportsFences: true,
    supportsSplines: true,
    supportsWater: true,
    supportsRoof: false,
    supportsCheckpoints: true,
    tilesPerSupertile: 8,
    supertileTextureSize: 128,
    defaultTerrainHeight: 0,
  },
  
  [Game.BUGDOM]: {
    game: Game.BUGDOM,
    minMapWidth: 16,
    maxMapWidth: 256,
    minMapHeight: 16,
    maxMapHeight: 256,
    requiresHeader: true,
    requiresYCrd: true,
    requiresAtrb: true,
    requiresLayr: true,
    requiresItCo: true,
    requiresSTgd: false,  // Composed at runtime
    requiresXlat: true,
    requiresTimg: true,
    supportsFences: true,
    supportsSplines: true,
    supportsWater: false,  // No water bodies
    supportsRoof: true,    // Has roof terrain
    supportsCheckpoints: false,
    tilesPerSupertile: 5,
    supertileTextureSize: 160,
    defaultTerrainHeight: 0,
  },
  
  [Game.BUGDOM_2]: {
    game: Game.BUGDOM_2,
    minMapWidth: 16,
    maxMapWidth: 512,
    minMapHeight: 16,
    maxMapHeight: 512,
    requiresHeader: true,
    requiresYCrd: true,
    requiresAtrb: true,
    requiresLayr: true,
    requiresItCo: true,
    requiresSTgd: true,
    requiresXlat: false,
    requiresTimg: true,
    supportsFences: true,
    supportsSplines: true,
    supportsWater: true,
    supportsRoof: false,
    supportsCheckpoints: true,
    tilesPerSupertile: 8,
    supertileTextureSize: 128,
    defaultTerrainHeight: 0,
  },
  
  [Game.NANOSAUR]: {
    game: Game.NANOSAUR,
    minMapWidth: 16,
    maxMapWidth: 256,
    minMapHeight: 16,
    maxMapHeight: 256,
    requiresHeader: true,
    requiresYCrd: true,
    requiresAtrb: true,
    requiresLayr: true,
    requiresItCo: true,
    requiresSTgd: false,
    requiresXlat: true,
    requiresTimg: true,
    supportsFences: false,
    supportsSplines: false,
    supportsWater: false,
    supportsRoof: false,
    supportsCheckpoints: false,
    tilesPerSupertile: 5,
    supertileTextureSize: 160,
    defaultTerrainHeight: 0,
  },
  
  [Game.NANOSAUR_2]: {
    game: Game.NANOSAUR_2,
    minMapWidth: 16,
    maxMapWidth: 512,
    minMapHeight: 16,
    maxMapHeight: 512,
    requiresHeader: true,
    requiresYCrd: true,
    requiresAtrb: true,
    requiresLayr: true,
    requiresItCo: true,
    requiresSTgd: true,
    requiresXlat: false,
    requiresTimg: true,
    supportsFences: true,
    supportsSplines: true,
    supportsWater: true,
    supportsRoof: false,
    supportsCheckpoints: true,
    tilesPerSupertile: 8,
    supertileTextureSize: 256,
    defaultTerrainHeight: 0,
  },
  
  [Game.CRO_MAG]: {
    game: Game.CRO_MAG,
    minMapWidth: 16,
    maxMapWidth: 512,
    minMapHeight: 16,
    maxMapHeight: 512,
    requiresHeader: true,
    requiresYCrd: true,
    requiresAtrb: true,
    requiresLayr: true,
    requiresItCo: true,
    requiresSTgd: true,
    requiresXlat: false,
    requiresTimg: true,
    supportsFences: true,
    supportsSplines: true,
    supportsWater: true,  // Uses paths
    supportsRoof: false,
    supportsCheckpoints: true,
    tilesPerSupertile: 8,
    supertileTextureSize: 128,
    defaultTerrainHeight: 0,
  },
  
  [Game.BILLY_FRONTIER]: {
    game: Game.BILLY_FRONTIER,
    minMapWidth: 16,
    maxMapWidth: 512,
    minMapHeight: 16,
    maxMapHeight: 512,
    requiresHeader: true,
    requiresYCrd: true,
    requiresAtrb: true,
    requiresLayr: true,
    requiresItCo: true,
    requiresSTgd: true,
    requiresXlat: false,
    requiresTimg: true,
    supportsFences: true,
    supportsSplines: true,
    supportsWater: true,
    supportsRoof: false,
    supportsCheckpoints: false,
    tilesPerSupertile: 8,
    supertileTextureSize: 256,
    defaultTerrainHeight: 0,
  },
  
  [Game.MIGHTY_MIKE]: {
    game: Game.MIGHTY_MIKE,
    minMapWidth: 16,
    maxMapWidth: 128,
    minMapHeight: 16,
    maxMapHeight: 128,
    requiresHeader: false,  // Different format
    requiresYCrd: false,
    requiresAtrb: false,
    requiresLayr: true,
    requiresItCo: false,
    requiresSTgd: false,
    requiresXlat: false,
    requiresTimg: true,
    supportsFences: false,
    supportsSplines: false,
    supportsWater: false,
    supportsRoof: false,
    supportsCheckpoints: false,
    tilesPerSupertile: 1,  // Direct tiles
    supertileTextureSize: 32,
    defaultTerrainHeight: 0,
  },
};
```

---

## Phase 2: Level Template Generator

### 2.1 Core Template Generator

**File:** `frontend/src/data/levelTemplates/levelTemplateGenerator.ts`

```typescript
import { LevelData, StandardHeader, TileAttribute, SupertileGridEntry } from "@/python/structSpecs/LevelTypes";
import { Game, GlobalsInterface } from "@/data/globals/globals";
import { LEVEL_REQUIREMENTS, LevelRequirements } from "./levelRequirements";

export interface LevelTemplateOptions {
  mapWidth: number;
  mapHeight: number;
  defaultHeight: number;
  levelName?: string;
  version?: number;
}

/**
 * Generate a blank level for the specified game
 */
export function generateBlankLevel(
  game: Game,
  options: LevelTemplateOptions,
): LevelData {
  const requirements = LEVEL_REQUIREMENTS[game];
  
  // Validate dimensions
  validateDimensions(options, requirements);
  
  // Generate based on game type
  switch (game) {
    case Game.OTTO_MATIC:
    case Game.BUGDOM_2:
    case Game.NANOSAUR_2:
    case Game.CRO_MAG:
    case Game.BILLY_FRONTIER:
      return generateStandardLevel(options, requirements);
      
    case Game.BUGDOM:
      return generateBugdom1Level(options, requirements);
      
    case Game.NANOSAUR:
      return generateNanosaur1Level(options, requirements);
      
    case Game.MIGHTY_MIKE:
      return generateMightyMikeLevel(options, requirements);
      
    default:
      throw new Error(`Unsupported game: ${game}`);
  }
}

function validateDimensions(
  options: LevelTemplateOptions,
  requirements: LevelRequirements,
): void {
  if (options.mapWidth < requirements.minMapWidth ||
      options.mapWidth > requirements.maxMapWidth) {
    throw new Error(
      `Map width must be between ${requirements.minMapWidth} and ${requirements.maxMapWidth}`
    );
  }
  
  if (options.mapHeight < requirements.minMapHeight ||
      options.mapHeight > requirements.maxMapHeight) {
    throw new Error(
      `Map height must be between ${requirements.minMapHeight} and ${requirements.maxMapHeight}`
    );
  }
  
  // Ensure dimensions are multiples of supertile size
  const tps = requirements.tilesPerSupertile;
  if (options.mapWidth % tps !== 0) {
    throw new Error(`Map width must be a multiple of ${tps}`);
  }
  if (options.mapHeight % tps !== 0) {
    throw new Error(`Map height must be a multiple of ${tps}`);
  }
}
```

### 2.2 Standard Level Generator (Otto/Bugdom2/Nano2/CroMag/Billy)

```typescript
function generateStandardLevel(
  options: LevelTemplateOptions,
  requirements: LevelRequirements,
): LevelData {
  const { mapWidth, mapHeight, defaultHeight } = options;
  const tps = requirements.tilesPerSupertile;
  
  // Calculate derived values
  const numTilesX = mapWidth;
  const numTilesZ = mapHeight;
  const numSupertilesX = Math.ceil(mapWidth / tps);
  const numSupertilesZ = Math.ceil(mapHeight / tps);
  const numUniqueSupertiles = numSupertilesX * numSupertilesZ;
  
  // Create header
  const header: StandardHeader = {
    version: options.version ?? 1,
    numItems: 0,
    mapWidth,
    mapHeight,
    tileSize: 16,  // Standard tile size
    minY: defaultHeight,
    maxY: defaultHeight,
    numSplines: 0,
    numFences: 0,
    numTilePages: 1,
    numTiles: 1,  // At least one blank tile
    numUniqueSupertiles,
    numWaterPatches: 0,
    numCheckpoints: 0,
  };
  
  // Create terrain height array (YCrd)
  // Size is (mapWidth + 1) * (mapHeight + 1) for vertex corners
  const ycrdSize = (mapWidth + 1) * (mapHeight + 1);
  const ycrd = new Array(ycrdSize).fill(defaultHeight);
  
  // Create tile attributes - one blank tile
  const atrb: TileAttribute[] = [{
    flags: 0,
    p0: 0,
    p1: 0,
  }];
  
  // Create terrain layer - all tiles reference attribute 0
  const layr = new Array(mapWidth * mapHeight).fill(0);
  
  // Create item color array (grayscale gradient placeholder)
  const itcoSize = mapWidth * mapHeight;
  const itco = new Uint8Array(itcoSize);
  for (let i = 0; i < itcoSize; i++) {
    itco[i] = 128;  // Mid-gray
  }
  
  // Create supertile grid
  const stgd: SupertileGridEntry[] = [];
  for (let z = 0; z < numSupertilesZ; z++) {
    for (let x = 0; x < numSupertilesX; x++) {
      stgd.push({
        isEmpty: false,
        superTileId: z * numSupertilesX + x,
      });
    }
  }
  
  // Create blank supertile texture
  const supertileSize = requirements.supertileTextureSize;
  const blankTexture = createBlankSupertileTexture(supertileSize);
  
  // Assemble level data
  const levelData: LevelData = {
    Hedr: {
      1000: {
        name: "Header",
        obj: header,
        order: 0,
      },
    },
    YCrd: {
      1000: {
        name: "Floor&Ceiling Y Coords",
        obj: ycrd,
        order: 0,
      },
    },
    Atrb: {
      1000: {
        name: "Tile Attribute Data",
        obj: atrb,
        order: 0,
      },
    },
    Layr: {
      1000: {
        name: "Terrain Layer Matrix",
        obj: layr,
        order: 0,
      },
    },
    ItCo: {
      1000: {
        name: "Terrain Items Color Array",
        data: btoa(String.fromCharCode(...itco)),
        order: 0,
      },
    },
    STgd: {
      1000: {
        name: "SuperTile Grid",
        obj: stgd,
        order: 0,
      },
    },
    alis: {
      1000: {
        name: "Texture Page Picture Alias",
        data: blankTexture,
        order: 0,
      },
    },
    _metadata: {
      file_attributes: 0,
      junk1: 0,
      junk2: 0,
    },
  };
  
  // Add optional sections
  if (requirements.supportsFences) {
    levelData.Fenc = {
      1000: { name: "Fence List", obj: [], order: 0 },
    };
    levelData.FnNb = {};
  }
  
  if (requirements.supportsSplines) {
    levelData.Spln = {
      1000: { name: "Spline List", obj: [], order: 0 },
    };
    levelData.SpNb = {};
    levelData.SpPt = {};
    levelData.SpIt = {};
  }
  
  if (requirements.supportsWater) {
    levelData.Liqd = {
      1000: { name: "Water List", obj: [], order: 0 },
    };
  }
  
  // Add items section (empty)
  levelData.Itms = {
    1000: { name: "Terrain Items List", obj: [], order: 0 },
  };
  
  return levelData;
}

function createBlankSupertileTexture(size: number): string {
  // Create a simple grayscale texture as base64
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  
  // Fill with a neutral gray/green pattern
  ctx.fillStyle = "#3a5a3a";  // Grass-like green
  ctx.fillRect(0, 0, size, size);
  
  // Add subtle grid pattern
  ctx.strokeStyle = "#4a6a4a";
  ctx.lineWidth = 1;
  const gridSize = size / 8;
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(i * gridSize, 0);
    ctx.lineTo(i * gridSize, size);
    ctx.moveTo(0, i * gridSize);
    ctx.lineTo(size, i * gridSize);
    ctx.stroke();
  }
  
  // Convert to base64
  return canvas.toDataURL("image/png").split(",")[1];
}
```

### 2.3 Bugdom 1 Level Generator

```typescript
function generateBugdom1Level(
  options: LevelTemplateOptions,
  requirements: LevelRequirements,
): LevelData {
  const { mapWidth, mapHeight, defaultHeight } = options;
  
  // Bugdom 1 has both floor and roof terrain
  const ycrdSize = (mapWidth + 1) * (mapHeight + 1);
  const floorYcrd = new Array(ycrdSize).fill(defaultHeight);
  const roofYcrd = new Array(ycrdSize).fill(defaultHeight + 200);  // Roof above floor
  
  // Individual tiles for Bugdom
  const tileSize = 32;
  const numTilesX = mapWidth;
  const numTilesZ = mapHeight;
  
  // Create blank tile attribute (extended format for Bugdom 1)
  const atrb = [{
    bits: 0,
    parm0: 0,
    parm1: 0,
    parm2: 0,
    undefined: 0,
    flags: 0,
    p0: 0,
    p1: 0,
  }];
  
  // Translation table
  const xlat = [{ idx: 0 }];
  
  // Terrain layer
  const layr = new Array(mapWidth * mapHeight).fill(0);
  
  // Create blank tile image (32x32 pixels, 16-bit)
  const blankTileData = createBlank16BitTile(tileSize);
  
  const levelData: LevelData = {
    Hedr: {
      1000: {
        name: "Header",
        obj: {
          version: options.version ?? 1,
          numItems: 0,
          mapWidth,
          mapHeight,
          tileSize,
          minY: defaultHeight,
          maxY: defaultHeight + 200,
          numSplines: 0,
          numFences: 0,
          numTilePages: 1,
          numTiles: 1,
          numUniqueSupertiles: 0,
          numWaterPatches: 0,
          numCheckpoints: 0,
        },
        order: 0,
      },
    },
    YCrd: {
      1000: {
        name: "Floor&Ceiling Y Coords",
        obj: floorYcrd,
        order: 0,
      },
      1001: {
        name: "Roof Y Coords",
        obj: roofYcrd,
        order: 1,
      },
    },
    Atrb: {
      1000: { name: "Tile Attribute Data", obj: atrb, order: 0 },
    },
    Layr: {
      1000: { name: "Terrain Layer Matrix", obj: layr, order: 0 },
    },
    Xlat: {
      1000: { name: "Tile Index Translation Table", obj: xlat, order: 0 },
    },
    Timg: {
      1000: {
        name: "Extracted Tile Image Data 32x32/16bit",
        data: blankTileData,
        order: 0,
      },
    },
    ItCo: {
      1000: {
        name: "Terrain Items Color Array",
        data: btoa(String.fromCharCode(...new Uint8Array(mapWidth * mapHeight).fill(128))),
        order: 0,
      },
    },
    alis: {},
    _metadata: {
      file_attributes: 0,
      junk1: 0,
      junk2: 0,
    },
  };
  
  // Add optional sections
  levelData.Fenc = { 1000: { name: "Fence List", obj: [], order: 0 } };
  levelData.FnNb = {};
  levelData.Spln = { 1000: { name: "Spline List", obj: [], order: 0 } };
  levelData.SpNb = {};
  levelData.SpPt = {};
  levelData.SpIt = {};
  levelData.Itms = { 1000: { name: "Terrain Items List", obj: [], order: 0 } };
  
  return levelData;
}

function createBlank16BitTile(size: number): string {
  // Create 16-bit ARGB1555 tile data
  const pixels = size * size;
  const data = new Uint8Array(pixels * 2);
  
  // Fill with green-ish color
  const r = 5, g = 12, b = 5;  // 5-bit values
  const packed = (1 << 15) | (r << 10) | (g << 5) | b;
  
  for (let i = 0; i < pixels; i++) {
    data[i * 2] = (packed >> 8) & 0xFF;
    data[i * 2 + 1] = packed & 0xFF;
  }
  
  return btoa(String.fromCharCode(...data));
}
```

### 2.4 Nanosaur 1 Level Generator

```typescript
function generateNanosaur1Level(
  options: LevelTemplateOptions,
  requirements: LevelRequirements,
): LevelData {
  // Similar to Bugdom 1 but without roof terrain
  const { mapWidth, mapHeight, defaultHeight } = options;
  const tileSize = 32;
  
  const ycrdSize = (mapWidth + 1) * (mapHeight + 1);
  const ycrd = new Array(ycrdSize).fill(defaultHeight);
  
  const atrb = [{ flags: 0, p0: 0, p1: 0 }];
  const xlat = [{ idx: 0 }];
  const layr = new Array(mapWidth * mapHeight).fill(0);
  
  const levelData: LevelData = {
    Hedr: {
      1000: {
        name: "Header",
        obj: {
          version: options.version ?? 1,
          numItems: 0,
          mapWidth,
          mapHeight,
          tileSize,
          minY: defaultHeight,
          maxY: defaultHeight,
          numSplines: 0,
          numFences: 0,
          numTilePages: 1,
          numTiles: 1,
          numUniqueSupertiles: 0,
          numWaterPatches: 0,
          numCheckpoints: 0,
        },
        order: 0,
      },
    },
    YCrd: {
      1000: { name: "Floor&Ceiling Y Coords", obj: ycrd, order: 0 },
    },
    Atrb: {
      1000: { name: "Tile Attribute Data", obj: atrb, order: 0 },
    },
    Layr: {
      1000: { name: "Terrain Layer Matrix", obj: layr, order: 0 },
    },
    Xlat: {
      1000: { name: "Tile Index Translation Table", obj: xlat, order: 0 },
    },
    Timg: {
      1000: {
        name: "Extracted Tile Image Data 32x32/16bit",
        data: createBlank16BitTile(tileSize),
        order: 0,
      },
    },
    ItCo: {
      1000: {
        name: "Terrain Items Color Array",
        data: btoa(String.fromCharCode(...new Uint8Array(mapWidth * mapHeight).fill(128))),
        order: 0,
      },
    },
    alis: {},
    _metadata: {
      file_attributes: 0,
      junk1: 0,
      junk2: 0,
      nanosaur1RawLevel: {},  // Nanosaur-specific metadata
    },
    Itms: {
      1000: { name: "Terrain Items List", obj: [], order: 0 },
    },
  };
  
  return levelData;
}
```

### 2.5 Mighty Mike Level Generator

```typescript
function generateMightyMikeLevel(
  options: LevelTemplateOptions,
  requirements: LevelRequirements,
): LevelData {
  const { mapWidth, mapHeight } = options;
  
  // Mighty Mike is a 2D tilemap game, different structure
  const tileMap = new Array(mapWidth * mapHeight).fill(0);  // All blank tiles
  
  const levelData: LevelData = {
    Hedr: {
      1000: {
        name: "Header",
        obj: {
          version: 1,
          numItems: 0,
          mapWidth,
          mapHeight,
          tileSize: 32,
          minY: 0,
          maxY: 0,
          numSplines: 0,
          numFences: 0,
          numTilePages: 1,
          numTiles: 1,
          numUniqueSupertiles: 0,
          numWaterPatches: 0,
          numCheckpoints: 0,
        },
        order: 0,
      },
    },
    Layr: {
      1000: { name: "Terrain Layer Matrix", obj: tileMap, order: 0 },
    },
    Atrb: {
      1000: { name: "Tile Attribute Data", obj: [], order: 0 },
    },
    YCrd: {
      1000: { name: "Floor&Ceiling Y Coords", obj: [], order: 0 },
    },
    ItCo: {
      1000: { name: "Terrain Items Color Array", data: "", order: 0 },
    },
    alis: {},
    _metadata: {
      file_attributes: 0,
      junk1: 0,
      junk2: 0,
      mightyMikeMapData: {
        width: mapWidth,
        height: mapHeight,
        tiles: tileMap,
        items: [],
      },
    },
    Itms: {
      1000: { name: "Terrain Items List", obj: [], order: 0 },
    },
  };
  
  return levelData;
}
```

---

## Phase 3: New Level Dialog UI

### 3.1 New Level Dialog Component

**File:** `frontend/src/editor/dialogs/NewLevelDialog.tsx`

```typescript
import React, { useState, useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Globals, Game } from "@/data/globals/globals";
import { LEVEL_REQUIREMENTS } from "@/data/levelTemplates/levelRequirements";
import { generateBlankLevel, LevelTemplateOptions } from "@/data/levelTemplates/levelTemplateGenerator";

interface NewLevelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateLevel: (levelData: LevelData) => void;
}

export const NewLevelDialog: React.FC<NewLevelDialogProps> = ({
  isOpen,
  onClose,
  onCreateLevel,
}) => {
  const globals = useAtomValue(Globals);
  const requirements = LEVEL_REQUIREMENTS[globals.GAME_TYPE];
  
  const [options, setOptions] = useState<LevelTemplateOptions>({
    mapWidth: requirements.minMapWidth * 2,
    mapHeight: requirements.minMapHeight * 2,
    defaultHeight: 0,
    levelName: "New Level",
  });
  
  const [error, setError] = useState<string | null>(null);
  
  // Calculate valid dimension options
  const dimensionOptions = useMemo(() => {
    const options: number[] = [];
    const tps = requirements.tilesPerSupertile;
    for (let d = requirements.minMapWidth; d <= requirements.maxMapWidth; d += tps) {
      options.push(d);
    }
    return options;
  }, [requirements]);
  
  const handleCreate = () => {
    try {
      setError(null);
      const levelData = generateBlankLevel(globals.GAME_TYPE, options);
      onCreateLevel(levelData);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create level");
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-[500px]">
        <h2 className="text-2xl font-bold text-white mb-6">
          Create New Level
        </h2>
        
        <div className="space-y-4">
          {/* Game Info */}
          <div className="p-3 bg-gray-800 rounded">
            <p className="text-sm text-gray-400">Creating level for:</p>
            <p className="text-lg text-white font-semibold">{globals.GAME_NAME}</p>
          </div>
          
          {/* Level Name */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Level Name</label>
            <input
              type="text"
              value={options.levelName}
              onChange={(e) => setOptions({ ...options, levelName: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded"
            />
          </div>
          
          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Width (tiles)</label>
              <select
                value={options.mapWidth}
                onChange={(e) => setOptions({ ...options, mapWidth: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded"
              >
                {dimensionOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Height (tiles)</label>
              <select
                value={options.mapHeight}
                onChange={(e) => setOptions({ ...options, mapHeight: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded"
              >
                {dimensionOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Default Height */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Default Terrain Height</label>
            <input
              type="number"
              value={options.defaultHeight}
              onChange={(e) => setOptions({ ...options, defaultHeight: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded"
            />
          </div>
          
          {/* Level Stats Preview */}
          <div className="p-3 bg-gray-800 rounded text-sm">
            <p className="text-gray-400">Level Statistics:</p>
            <ul className="mt-2 text-white space-y-1">
              <li>• Tiles: {options.mapWidth} × {options.mapHeight} = {options.mapWidth * options.mapHeight}</li>
              <li>• Supertiles: {Math.ceil(options.mapWidth / requirements.tilesPerSupertile)} × {Math.ceil(options.mapHeight / requirements.tilesPerSupertile)}</li>
              <li>• Supports fences: {requirements.supportsFences ? "Yes" : "No"}</li>
              <li>• Supports splines: {requirements.supportsSplines ? "Yes" : "No"}</li>
              <li>• Supports water: {requirements.supportsWater ? "Yes" : "No"}</li>
            </ul>
          </div>
          
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-900/50 text-red-300 rounded">
              {error}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold"
            >
              Create Level
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 3.2 Integrate with Main App

**File:** `frontend/src/App.tsx` (modifications)

```typescript
import { NewLevelDialog } from "./editor/dialogs/NewLevelDialog";
import { useCallback, useState } from "react";

function App() {
  const [showNewLevelDialog, setShowNewLevelDialog] = useState(false);
  
  const handleCreateLevel = useCallback((levelData: LevelData) => {
    // Set the new level data
    setData(levelData);
    
    // Generate blank textures/images
    const blankImages = generateBlankMapImages(levelData, globals);
    setMapImages(blankImages);
    
    // Reset selection state
    setSelectedItem(null);
    setSelectedFence(null);
    setSelectedSpline(null);
    // etc.
  }, [setData, globals]);
  
  return (
    <>
      {/* ... existing UI ... */}
      
      {/* New Level button in toolbar */}
      <button onClick={() => setShowNewLevelDialog(true)}>
        New Level
      </button>
      
      <NewLevelDialog
        isOpen={showNewLevelDialog}
        onClose={() => setShowNewLevelDialog(false)}
        onCreateLevel={handleCreateLevel}
      />
    </>
  );
}
```

---

## Phase 4: Texture Generation

### 4.1 Generate Blank Map Images

**File:** `frontend/src/data/levelTemplates/blankMapImages.ts`

```typescript
import { LevelData, StandardHeader } from "@/python/structSpecs/LevelTypes";
import { GlobalsInterface, Game } from "@/data/globals/globals";

/**
 * Generate blank map images for a new level
 */
export function generateBlankMapImages(
  levelData: LevelData,
  globals: GlobalsInterface,
): HTMLCanvasElement[] {
  const header = levelData.Hedr[1000].obj;
  const tps = globals.TILES_PER_SUPERTILE;
  const textureSize = globals.SUPERTILE_TEXMAP_SIZE;
  
  const numSupertilesX = Math.ceil(header.mapWidth / tps);
  const numSupertilesZ = Math.ceil(header.mapHeight / tps);
  const numSupertiles = numSupertilesX * numSupertilesZ;
  
  const images: HTMLCanvasElement[] = [];
  
  for (let i = 0; i < numSupertiles; i++) {
    const canvas = document.createElement("canvas");
    canvas.width = textureSize;
    canvas.height = textureSize;
    const ctx = canvas.getContext("2d")!;
    
    // Fill with default color based on game
    const color = getDefaultTerrainColor(globals.GAME_TYPE);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, textureSize, textureSize);
    
    // Add grid pattern
    ctx.strokeStyle = adjustColor(color, 20);
    ctx.lineWidth = 1;
    const gridSize = textureSize / tps;
    for (let j = 0; j <= tps; j++) {
      ctx.beginPath();
      ctx.moveTo(j * gridSize, 0);
      ctx.lineTo(j * gridSize, textureSize);
      ctx.moveTo(0, j * gridSize);
      ctx.lineTo(textureSize, j * gridSize);
      ctx.stroke();
    }
    
    images.push(canvas);
  }
  
  return images;
}

function getDefaultTerrainColor(game: Game): string {
  switch (game) {
    case Game.OTTO_MATIC:
      return "#4a7a4a";  // Farm green
    case Game.BUGDOM:
    case Game.BUGDOM_2:
      return "#5a8a5a";  // Grass green
    case Game.NANOSAUR:
    case Game.NANOSAUR_2:
      return "#6a9a6a";  // Jungle green
    case Game.CRO_MAG:
      return "#8a7a5a";  // Dirt brown
    case Game.BILLY_FRONTIER:
      return "#9a8a6a";  // Desert tan
    case Game.MIGHTY_MIKE:
      return "#5a5a5a";  // Gray
    default:
      return "#808080";
  }
}

function adjustColor(hex: string, amount: number): string {
  const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
```

---

## Phase 5: Validation and Testing

### 5.1 Level Validation

**File:** `frontend/src/data/levelTemplates/levelValidator.ts`

```typescript
import { LevelData } from "@/python/structSpecs/LevelTypes";
import { GlobalsInterface, Game } from "@/data/globals/globals";
import { LEVEL_REQUIREMENTS } from "./levelRequirements";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate level data for a specific game
 */
export function validateLevelData(
  levelData: LevelData,
  globals: GlobalsInterface,
): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [] };
  const requirements = LEVEL_REQUIREMENTS[globals.GAME_TYPE];
  
  // Check header
  const header = levelData.Hedr?.[1000]?.obj;
  if (!header) {
    result.errors.push("Missing header data");
    result.valid = false;
    return result;
  }
  
  // Validate dimensions
  if (header.mapWidth < requirements.minMapWidth ||
      header.mapWidth > requirements.maxMapWidth) {
    result.errors.push(`Map width ${header.mapWidth} out of valid range`);
    result.valid = false;
  }
  
  if (header.mapHeight < requirements.minMapHeight ||
      header.mapHeight > requirements.maxMapHeight) {
    result.errors.push(`Map height ${header.mapHeight} out of valid range`);
    result.valid = false;
  }
  
  // Check required sections
  if (requirements.requiresYCrd && !levelData.YCrd?.[1000]?.obj) {
    result.errors.push("Missing terrain height data (YCrd)");
    result.valid = false;
  }
  
  if (requirements.requiresAtrb && !levelData.Atrb?.[1000]?.obj) {
    result.errors.push("Missing tile attributes (Atrb)");
    result.valid = false;
  }
  
  if (requirements.requiresLayr && !levelData.Layr?.[1000]?.obj) {
    result.errors.push("Missing terrain layer (Layr)");
    result.valid = false;
  }
  
  // Validate YCrd size
  if (levelData.YCrd?.[1000]?.obj) {
    const expectedSize = (header.mapWidth + 1) * (header.mapHeight + 1);
    const actualSize = levelData.YCrd[1000].obj.length;
    if (actualSize !== expectedSize) {
      result.errors.push(`YCrd size mismatch: expected ${expectedSize}, got ${actualSize}`);
      result.valid = false;
    }
  }
  
  // Validate Layr size
  if (levelData.Layr?.[1000]?.obj) {
    const expectedSize = header.mapWidth * header.mapHeight;
    const actualSize = levelData.Layr[1000].obj.length;
    if (actualSize !== expectedSize) {
      result.errors.push(`Layr size mismatch: expected ${expectedSize}, got ${actualSize}`);
      result.valid = false;
    }
  }
  
  // Check for roof terrain (Bugdom 1)
  if (requirements.supportsRoof && !levelData.YCrd?.[1001]?.obj) {
    result.warnings.push("Roof terrain data missing (YCrd 1001)");
  }
  
  // Validate item count
  const itemCount = levelData.Itms?.[1000]?.obj?.length ?? 0;
  if (header.numItems !== itemCount) {
    result.warnings.push(`Header numItems (${header.numItems}) doesn't match actual items (${itemCount})`);
  }
  
  return result;
}
```

### 5.2 Test Suite

**File:** `frontend/tests/levelTemplates/levelTemplateGenerator.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { generateBlankLevel } from "@/data/levelTemplates/levelTemplateGenerator";
import { validateLevelData } from "@/data/levelTemplates/levelValidator";
import { Game, OttoGlobals, BugdomGlobals, Nanosaur2Globals } from "@/data/globals/globals";

const GAMES_TO_TEST: [Game, GlobalsInterface][] = [
  [Game.OTTO_MATIC, OttoGlobals],
  [Game.BUGDOM, BugdomGlobals],
  [Game.BUGDOM_2, Bugdom2Globals],
  [Game.NANOSAUR, NanosaurGlobals],
  [Game.NANOSAUR_2, Nanosaur2Globals],
  [Game.CRO_MAG, CroMagGlobals],
  [Game.BILLY_FRONTIER, BillyFrontierGlobals],
];

describe("Level Template Generator", () => {
  for (const [game, globals] of GAMES_TO_TEST) {
    describe(globals.GAME_NAME, () => {
      it("should generate valid blank level", () => {
        const level = generateBlankLevel(game, {
          mapWidth: 64,
          mapHeight: 64,
          defaultHeight: 0,
        });
        
        expect(level).toBeDefined();
        expect(level.Hedr).toBeDefined();
        expect(level.Hedr[1000].obj.mapWidth).toBe(64);
        expect(level.Hedr[1000].obj.mapHeight).toBe(64);
      });
      
      it("should pass validation", () => {
        const level = generateBlankLevel(game, {
          mapWidth: 64,
          mapHeight: 64,
          defaultHeight: 0,
        });
        
        const validation = validateLevelData(level, globals);
        
        if (!validation.valid) {
          console.error("Validation errors:", validation.errors);
        }
        
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });
      
      it("should reject invalid dimensions", () => {
        expect(() => generateBlankLevel(game, {
          mapWidth: 3,  // Too small
          mapHeight: 64,
          defaultHeight: 0,
        })).toThrow();
      });
      
      it("should generate correct YCrd size", () => {
        const level = generateBlankLevel(game, {
          mapWidth: 64,
          mapHeight: 32,
          defaultHeight: 100,
        });
        
        const ycrd = level.YCrd?.[1000]?.obj;
        if (ycrd) {
          expect(ycrd.length).toBe(65 * 33);  // (width+1) * (height+1)
          expect(ycrd[0]).toBe(100);
        }
      });
    });
  }
});
```

---

## File Summary

### New Files to Create

```
frontend/src/data/levelTemplates/
├── index.ts                     # Export all
├── levelRequirements.ts         # Game requirements
├── levelTemplateGenerator.ts    # Core generator
├── levelValidator.ts            # Validation
└── blankMapImages.ts            # Texture generation

frontend/src/editor/dialogs/
└── NewLevelDialog.tsx           # UI dialog

frontend/tests/levelTemplates/
└── levelTemplateGenerator.test.ts  # Tests
```

### Files to Modify

```
frontend/src/App.tsx
  - Add New Level button and dialog

frontend/src/editor/EditorToolbar.tsx
  - Add New Level button
```

---

## Implementation Order

1. **Phase 1**: Analyze requirements (2 hours)
2. **Phase 2**: Core template generator (6 hours)
3. **Phase 3**: New level dialog (2 hours)
4. **Phase 4**: Texture generation (2 hours)
5. **Phase 5**: Validation and testing (3 hours)

**Total estimated effort**: 15 hours

---

## Success Criteria

1. Users can create blank levels for all 8 supported games
2. Generated levels pass validation
3. Generated levels can be saved and reloaded
4. Generated levels can be opened in the original games (basic validation)
5. No crashes when creating levels with various dimensions
