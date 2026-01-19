# Creating Blank Levels for All Games Plan

## Overview

This plan outlines the implementation of creating blank/empty levels for all supported games. Unlike loading existing levels, this feature generates minimal valid level data structures that can be saved and edited, allowing users to create levels from scratch.

---

## Current State Analysis

### Games and Their Level Formats

| Game | Format | Header Type | Required Resources |
|------|--------|-------------|-------------------|
| Otto Matic | Resource fork | OttoMaticHeader | Hedr, Itms, YCrd, Atrb, STgd, Spln |
| Bugdom 1 | Resource fork | BugdomHeader | Hedr, Itms, YCrd, Atrb, STgd, Layr, Spln |
| Bugdom 2 | Resource fork | Bugdom2Header | Hedr, Itms, YCrd, Atrb, STgd, Spln |
| Nanosaur 1 | Binary .ter | NanosaurHeader | Custom binary |
| Nanosaur 2 | Resource fork | Nanosaur2Header | Hedr, Itms, YCrd, Atrb, STgd, Spln |
| Cro-Mag Rally | Resource fork | CroMagHeader | Hedr, Itms, YCrd, Atrb, STgd, Spln |
| Billy Frontier | Resource fork | BillyFrontierHeader | Hedr, Itms, YCrd, Atrb, STgd, Layr, Spln |
| Mighty Mike | Custom | MightyMikeHeader | Custom tilemap format |

### Header Structures

The header contains critical dimensions and metadata:

```typescript
// Common fields across most games
interface BaseHeader {
  mapWidth: number;     // Width in tiles
  mapHeight: number;    // Height in tiles
  numItems: number;     // Number of items (starts at 0 for blank)
  numSplines: number;   // Number of splines (starts at 0 for blank)
  numFences: number;    // Number of fences (starts at 0 for blank)
}

// Otto Matic specific
interface OttoMaticHeader extends BaseHeader {
  numTilePages: number;
  numTiles: number;
  numUniqueSupertiles: number;
  // ... more fields
}
```

---

## Implementation Plan

### Phase 1: Blank Level Data Factories

#### 1.1 Blank Level Types

**File:** `src/data/blankLevel/types.ts`

```typescript
import type { LevelData } from '@/python/structSpecs/LevelTypes';
import { Game } from '@/data/globals/globals';

/**
 * Options for creating a blank level
 */
export interface BlankLevelOptions {
  /** Width in tiles (must be divisible by TILES_PER_SUPERTILE) */
  mapWidth: number;
  /** Height in tiles (must be divisible by TILES_PER_SUPERTILE) */
  mapHeight: number;
  /** Default terrain height */
  defaultHeight?: number;
  /** Default tile attribute */
  defaultTileFlags?: number;
  /** Level name (for display) */
  levelName?: string;
}

/**
 * Result of creating a blank level
 */
export interface BlankLevelResult {
  success: boolean;
  levelData?: LevelData;
  error?: string;
  warnings?: string[];
}

/**
 * Per-game configuration for blank level creation
 */
export interface GameBlankLevelConfig {
  game: Game;
  tilesPerSupertile: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  defaultWidth: number;
  defaultHeight: number;
  defaultTerrainHeight: number;
  createBlankLevel: (options: BlankLevelOptions) => BlankLevelResult;
}
```

#### 1.2 Common Level Factory Utilities

**File:** `src/data/blankLevel/levelFactoryUtils.ts`

```typescript
import type { BlankLevelOptions } from './types';

/**
 * Create height data array (YCrd)
 * Note: YCrd is (mapWidth + 1) × (mapHeight + 1) for vertex heights
 */
export function createHeightArray(
  mapWidth: number,
  mapHeight: number,
  defaultHeight: number = 0
): number[] {
  const size = (mapWidth + 1) * (mapHeight + 1);
  return new Array(size).fill(defaultHeight);
}

/**
 * Create attribute array (Atrb)
 * Size: mapWidth × mapHeight
 */
export function createAttributeArray(
  mapWidth: number,
  mapHeight: number,
  defaultFlags: number = 0,
  defaultP0: number = 0,
  defaultP1: number = 0
): Array<{ flags: number; p0: number; p1: number }> {
  const size = mapWidth * mapHeight;
  return new Array(size).fill(null).map(() => ({
    flags: defaultFlags,
    p0: defaultP0,
    p1: defaultP1,
  }));
}

/**
 * Create supertile grid (STgd)
 * Size: (mapWidth / tilesPerSupertile) × (mapHeight / tilesPerSupertile)
 */
export function createSupertileGrid(
  mapWidth: number,
  mapHeight: number,
  tilesPerSupertile: number,
  emptyValue: number = -1
): Array<{ superTileId: number } | { isEmpty: boolean; superTileId: number }> {
  const gridWidth = mapWidth / tilesPerSupertile;
  const gridHeight = mapHeight / tilesPerSupertile;
  const size = gridWidth * gridHeight;
  
  // Different games use different empty representations
  return new Array(size).fill(null).map(() => ({
    isEmpty: true,
    superTileId: emptyValue,
  }));
}

/**
 * Create layer array for tile-based games (Layr)
 */
export function createLayerArray(
  mapWidth: number,
  mapHeight: number,
  defaultTile: number = 0
): number[] {
  const size = mapWidth * mapHeight;
  return new Array(size).fill(defaultTile);
}

/**
 * Validate blank level options
 */
export function validateBlankLevelOptions(
  options: BlankLevelOptions,
  tilesPerSupertile: number,
  minWidth: number,
  maxWidth: number,
  minHeight: number,
  maxHeight: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (options.mapWidth < minWidth) {
    errors.push(`Width must be at least ${minWidth} tiles`);
  }
  if (options.mapWidth > maxWidth) {
    errors.push(`Width cannot exceed ${maxWidth} tiles`);
  }
  if (options.mapHeight < minHeight) {
    errors.push(`Height must be at least ${minHeight} tiles`);
  }
  if (options.mapHeight > maxHeight) {
    errors.push(`Height cannot exceed ${maxHeight} tiles`);
  }
  if (options.mapWidth % tilesPerSupertile !== 0) {
    errors.push(`Width must be divisible by ${tilesPerSupertile}`);
  }
  if (options.mapHeight % tilesPerSupertile !== 0) {
    errors.push(`Height must be divisible by ${tilesPerSupertile}`);
  }

  return { valid: errors.length === 0, errors };
}
```

### Phase 2: Per-Game Blank Level Factories

#### 2.1 Otto Matic Blank Level

**File:** `src/data/blankLevel/games/ottoMatic.ts`

```typescript
import type { LevelData } from '@/python/structSpecs/LevelTypes';
import type { BlankLevelOptions, BlankLevelResult, GameBlankLevelConfig } from '../types';
import {
  createHeightArray,
  createAttributeArray,
  createSupertileGrid,
  validateBlankLevelOptions,
} from '../levelFactoryUtils';
import { Game } from '@/data/globals/globals';

const TILES_PER_SUPERTILE = 8;

export function createBlankOttoMaticLevel(options: BlankLevelOptions): BlankLevelResult {
  // Validate options
  const validation = validateBlankLevelOptions(
    options,
    TILES_PER_SUPERTILE,
    16, 512, 16, 512
  );
  if (!validation.valid) {
    return { success: false, error: validation.errors.join('; ') };
  }

  const { mapWidth, mapHeight, defaultHeight = 0 } = options;
  const supertileGridWidth = mapWidth / TILES_PER_SUPERTILE;
  const supertileGridHeight = mapHeight / TILES_PER_SUPERTILE;

  // Create header
  const header = {
    version: 1,
    mapWidth,
    mapHeight,
    numItems: 1, // At least start position
    numSplines: 0,
    numFences: 0,
    numUniqueSupertiles: 0,
    numTilePages: 0,
    numTiles: mapWidth * mapHeight,
    // Additional Otto-specific fields
    playerStartX: mapWidth * 16, // Center of map in game units
    playerStartZ: mapHeight * 16,
    playerStartRotY: 0,
  };

  // Create terrain data
  const yCrd = createHeightArray(mapWidth, mapHeight, defaultHeight);
  const atrb = createAttributeArray(mapWidth, mapHeight, 0, 0, 0);
  const stgd = createSupertileGrid(mapWidth, mapHeight, TILES_PER_SUPERTILE);

  // Create minimal item list (just start position)
  const items = [
    {
      x: mapWidth * 16, // Center X
      z: mapHeight * 16, // Center Z
      type: 0, // StartCoords
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 0,
      flags: 0,
    },
  ];

  // Create empty spline structure
  const splines = {
    1000: {
      obj: {}, // Empty spline dictionary
    },
  };

  // Assemble level data
  const levelData: LevelData = {
    Hedr: {
      1000: { obj: header },
    },
    Itms: {
      1000: { obj: items },
    },
    YCrd: {
      1000: { obj: yCrd },
    },
    Atrb: {
      1000: { obj: atrb },
    },
    STgd: {
      1000: { obj: stgd },
    },
    Spln: splines,
    SpNb: {},
    SpPt: {},
    SpIt: {},
    _metadata: {
      format: 'rsrc',
      game: 'otto_matic',
    },
  };

  return { success: true, levelData };
}

export const ottoMaticBlankLevelConfig: GameBlankLevelConfig = {
  game: Game.OTTO_MATIC,
  tilesPerSupertile: TILES_PER_SUPERTILE,
  minWidth: 16,
  minHeight: 16,
  maxWidth: 512,
  maxHeight: 512,
  defaultWidth: 64,
  defaultHeight: 64,
  defaultTerrainHeight: 0,
  createBlankLevel: createBlankOttoMaticLevel,
};
```

#### 2.2 Bugdom 1 Blank Level

**File:** `src/data/blankLevel/games/bugdom.ts`

```typescript
import type { LevelData } from '@/python/structSpecs/LevelTypes';
import type { BlankLevelOptions, BlankLevelResult, GameBlankLevelConfig } from '../types';
import {
  createHeightArray,
  createAttributeArray,
  createSupertileGrid,
  createLayerArray,
  validateBlankLevelOptions,
} from '../levelFactoryUtils';
import { Game } from '@/data/globals/globals';

const TILES_PER_SUPERTILE = 5;

export function createBlankBugdomLevel(options: BlankLevelOptions): BlankLevelResult {
  const validation = validateBlankLevelOptions(
    options,
    TILES_PER_SUPERTILE,
    10, 256, 10, 256
  );
  if (!validation.valid) {
    return { success: false, error: validation.errors.join('; ') };
  }

  const { mapWidth, mapHeight, defaultHeight = 0 } = options;

  // Bugdom header
  const header = {
    version: 1,
    mapWidth,
    mapHeight,
    numItems: 1,
    numSplines: 0,
    numFences: 0,
    numTilePages: 1, // At least one tile page
    numTiles: mapWidth * mapHeight,
    numWaterPatches: 0,
    numUniqueSupertiles: 0,
  };

  // Create terrain data
  const yCrd = createHeightArray(mapWidth, mapHeight, defaultHeight);
  const yCrdRoof = createHeightArray(mapWidth, mapHeight, defaultHeight + 500); // Roof height
  const atrb = createAttributeArray(mapWidth, mapHeight);
  const stgd = createSupertileGrid(mapWidth, mapHeight, TILES_PER_SUPERTILE);
  const layr = createLayerArray(mapWidth, mapHeight, 0);

  // Start position
  const items = [
    {
      x: (mapWidth * 32) / 2,
      z: (mapHeight * 32) / 2,
      type: 0, // StartCoords
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 0,
      flags: 0,
    },
  ];

  const levelData: LevelData = {
    Hedr: { 1000: { obj: header } },
    Itms: { 1000: { obj: items } },
    YCrd: {
      1000: { obj: yCrd },
      1001: { obj: yCrdRoof }, // Roof heightmap
    },
    Atrb: { 1000: { obj: atrb } },
    STgd: { 1000: { obj: stgd } },
    Layr: { 1000: { obj: layr } },
    Spln: { 1000: { obj: {} } },
    SpNb: {},
    SpPt: {},
    SpIt: {},
    _metadata: {
      format: 'rsrc',
      game: 'bugdom',
    },
  };

  return { success: true, levelData };
}

export const bugdomBlankLevelConfig: GameBlankLevelConfig = {
  game: Game.BUGDOM,
  tilesPerSupertile: TILES_PER_SUPERTILE,
  minWidth: 10,
  minHeight: 10,
  maxWidth: 256,
  maxHeight: 256,
  defaultWidth: 50,
  defaultHeight: 50,
  defaultTerrainHeight: 0,
  createBlankLevel: createBlankBugdomLevel,
};
```

#### 2.3 Billy Frontier Blank Level

**File:** `src/data/blankLevel/games/billyFrontier.ts`

```typescript
import type { LevelData } from '@/python/structSpecs/LevelTypes';
import type { BlankLevelOptions, BlankLevelResult, GameBlankLevelConfig } from '../types';
import {
  createHeightArray,
  createAttributeArray,
  createSupertileGrid,
  createLayerArray,
  validateBlankLevelOptions,
} from '../levelFactoryUtils';
import { Game } from '@/data/globals/globals';

const TILES_PER_SUPERTILE = 8;

export function createBlankBillyFrontierLevel(options: BlankLevelOptions): BlankLevelResult {
  const validation = validateBlankLevelOptions(
    options,
    TILES_PER_SUPERTILE,
    16, 512, 16, 512
  );
  if (!validation.valid) {
    return { success: false, error: validation.errors.join('; ') };
  }

  const { mapWidth, mapHeight, defaultHeight = 0 } = options;

  const header = {
    version: 1,
    mapWidth,
    mapHeight,
    numItems: 1,
    numSplines: 0,
    numFences: 0,
    numUniqueSupertiles: 0,
    // Billy Frontier specific
    levelType: 0, // 0=duel, 1=stampede, 2=shootout
  };

  const yCrd = createHeightArray(mapWidth, mapHeight, defaultHeight);
  const atrb = createAttributeArray(mapWidth, mapHeight);
  const stgd = createSupertileGrid(mapWidth, mapHeight, TILES_PER_SUPERTILE);
  const layr = createLayerArray(mapWidth, mapHeight);

  const items = [
    {
      x: (mapWidth * 32) / 2,
      z: (mapHeight * 32) / 2,
      type: 0, // StartCoords
      p0: 0, // Starting rotation
      p1: 0,
      p2: 0,
      p3: 0,
      flags: 0,
    },
  ];

  const levelData: LevelData = {
    Hedr: { 1000: { obj: header } },
    Itms: { 1000: { obj: items } },
    YCrd: { 1000: { obj: yCrd } },
    Atrb: { 1000: { obj: atrb } },
    STgd: { 1000: { obj: stgd } },
    Layr: { 1000: { obj: layr } },
    Spln: { 1000: { obj: {} } },
    SpNb: {},
    SpPt: {},
    SpIt: {},
    _metadata: {
      format: 'rsrc',
      game: 'billy_frontier',
    },
  };

  return { success: true, levelData };
}

export const billyFrontierBlankLevelConfig: GameBlankLevelConfig = {
  game: Game.BILLY_FRONTIER,
  tilesPerSupertile: TILES_PER_SUPERTILE,
  minWidth: 16,
  minHeight: 16,
  maxWidth: 512,
  maxHeight: 512,
  defaultWidth: 64,
  defaultHeight: 64,
  defaultTerrainHeight: 0,
  createBlankLevel: createBlankBillyFrontierLevel,
};
```

#### 2.4 Nanosaur 1 Blank Level

**File:** `src/data/blankLevel/games/nanosaur.ts`

```typescript
import type { BlankLevelOptions, BlankLevelResult, GameBlankLevelConfig } from '../types';
import { validateBlankLevelOptions } from '../levelFactoryUtils';
import { Game } from '@/data/globals/globals';

const TILES_PER_SUPERTILE = 5;

/**
 * Nanosaur 1 uses a custom binary format, not resource forks
 */
export function createBlankNanosaurLevel(options: BlankLevelOptions): BlankLevelResult {
  const validation = validateBlankLevelOptions(
    options,
    TILES_PER_SUPERTILE,
    10, 256, 10, 256
  );
  if (!validation.valid) {
    return { success: false, error: validation.errors.join('; ') };
  }

  const { mapWidth, mapHeight, defaultHeight = 0 } = options;

  // Nanosaur uses a proprietary binary format
  // We need to create the complete binary structure
  
  // Header structure:
  // - textureLayerOffset
  // - heightmapLayerOffset
  // - pathLayerOffset
  // - objectListOffset
  // - heightmapTilesOffset
  // - width
  // - depth
  // - textureAttribOffset
  // - tileAnimDataOffset

  const textureLayerSize = mapWidth * mapHeight * 2; // Uint16 per tile
  const heightmapLayerSize = mapWidth * mapHeight * 2;
  const pathLayerSize = mapWidth * mapHeight * 2;
  
  // Create texture layer (all zeros = first texture)
  const textureLayer = new Uint16Array(mapWidth * mapHeight);
  
  // Create heightmap layer
  const heightmapLayer = new Uint16Array(mapWidth * mapHeight);
  heightmapLayer.fill(defaultHeight);
  
  // Create path layer (all zeros = no path)
  const pathLayer = new Uint16Array(mapWidth * mapHeight);
  
  // Create empty object list (just start position)
  const objects = [
    {
      x: (mapWidth * 32) / 2,
      z: (mapHeight * 32) / 2,
      type: 0,
      angle: 0,
      param: 0,
    },
  ];

  // Note: This creates the data structure, but the actual binary
  // serialization is handled by the save logic
  
  return {
    success: true,
    levelData: {
      _nanosaurData: {
        width: mapWidth,
        depth: mapHeight,
        textureLayer: Array.from(textureLayer),
        heightmapLayer: Array.from(heightmapLayer),
        pathLayer: Array.from(pathLayer),
        objects,
        textureAttribs: [],
        tileAnimData: [],
      },
      _metadata: {
        format: 'nanosaur_ter',
        game: 'nanosaur',
      },
    } as any,
  };
}

export const nanosaurBlankLevelConfig: GameBlankLevelConfig = {
  game: Game.NANOSAUR,
  tilesPerSupertile: TILES_PER_SUPERTILE,
  minWidth: 10,
  minHeight: 10,
  maxWidth: 256,
  maxHeight: 256,
  defaultWidth: 50,
  defaultHeight: 50,
  defaultTerrainHeight: 0,
  createBlankLevel: createBlankNanosaurLevel,
};
```

#### 2.5 Mighty Mike Blank Level

**File:** `src/data/blankLevel/games/mightyMike.ts`

```typescript
import type { BlankLevelOptions, BlankLevelResult, GameBlankLevelConfig } from '../types';
import { Game } from '@/data/globals/globals';

/**
 * Mighty Mike is a 2D tilemap game with different structure
 */
export function createBlankMightyMikeLevel(options: BlankLevelOptions): BlankLevelResult {
  const { mapWidth, mapHeight } = options;

  // Validate dimensions
  if (mapWidth < 20 || mapWidth > 200 || mapHeight < 15 || mapHeight > 150) {
    return {
      success: false,
      error: 'Dimensions must be 20-200 wide and 15-150 tall',
    };
  }

  // Create 2D tilemap (unlike 3D games, this is rows × columns)
  const mapImage: number[][] = [];
  for (let y = 0; y < mapHeight; y++) {
    const row: number[] = new Array(mapWidth).fill(0); // Empty tile
    mapImage.push(row);
  }

  // Create empty alt map
  const altMap: number[][] = [];
  for (let y = 0; y < mapHeight; y++) {
    const row: number[] = new Array(mapWidth).fill(0);
    altMap.push(row);
  }

  // Create minimal items (start position)
  const items = [
    {
      x: Math.floor(mapWidth / 2) * 16,
      y: Math.floor(mapHeight / 2) * 16,
      type: 0, // Player start
    },
  ];

  return {
    success: true,
    levelData: {
      _mightyMikeData: {
        mapWidth,
        mapHeight,
        mapImage,
        altMap,
        items,
        numItems: items.length,
      },
      _metadata: {
        format: 'mighty_mike',
        game: 'mighty_mike',
      },
    } as any,
  };
}

export const mightyMikeBlankLevelConfig: GameBlankLevelConfig = {
  game: Game.MIGHTY_MIKE,
  tilesPerSupertile: 1, // No supertiles in Mighty Mike
  minWidth: 20,
  minHeight: 15,
  maxWidth: 200,
  maxHeight: 150,
  defaultWidth: 60,
  defaultHeight: 40,
  defaultTerrainHeight: 0,
  createBlankLevel: createBlankMightyMikeLevel,
};
```

### Phase 3: Blank Level Registry

#### 3.1 Registry

**File:** `src/data/blankLevel/registry.ts`

```typescript
import { Game } from '@/data/globals/globals';
import type { GameBlankLevelConfig, BlankLevelOptions, BlankLevelResult } from './types';
import { ottoMaticBlankLevelConfig } from './games/ottoMatic';
import { bugdomBlankLevelConfig } from './games/bugdom';
import { bugdom2BlankLevelConfig } from './games/bugdom2';
import { billyFrontierBlankLevelConfig } from './games/billyFrontier';
import { nanosaurBlankLevelConfig } from './games/nanosaur';
import { nanosaur2BlankLevelConfig } from './games/nanosaur2';
import { croMagBlankLevelConfig } from './games/croMag';
import { mightyMikeBlankLevelConfig } from './games/mightyMike';

const BLANK_LEVEL_CONFIGS: Record<Game, GameBlankLevelConfig> = {
  [Game.OTTO_MATIC]: ottoMaticBlankLevelConfig,
  [Game.BUGDOM]: bugdomBlankLevelConfig,
  [Game.BUGDOM_2]: bugdom2BlankLevelConfig,
  [Game.BILLY_FRONTIER]: billyFrontierBlankLevelConfig,
  [Game.NANOSAUR]: nanosaurBlankLevelConfig,
  [Game.NANOSAUR_2]: nanosaur2BlankLevelConfig,
  [Game.CRO_MAG]: croMagBlankLevelConfig,
  [Game.MIGHTY_MIKE]: mightyMikeBlankLevelConfig,
};

/**
 * Get blank level configuration for a game
 */
export function getBlankLevelConfig(game: Game): GameBlankLevelConfig {
  return BLANK_LEVEL_CONFIGS[game];
}

/**
 * Create a blank level for the specified game
 */
export function createBlankLevel(
  game: Game,
  options: BlankLevelOptions
): BlankLevelResult {
  const config = getBlankLevelConfig(game);
  return config.createBlankLevel(options);
}

/**
 * Create a blank level with default options
 */
export function createDefaultBlankLevel(game: Game): BlankLevelResult {
  const config = getBlankLevelConfig(game);
  return config.createBlankLevel({
    mapWidth: config.defaultWidth,
    mapHeight: config.defaultHeight,
    defaultHeight: config.defaultTerrainHeight,
  });
}
```

### Phase 4: UI Components

#### 4.1 New Level Dialog

**File:** `src/editor/components/NewLevelDialog.tsx`

```typescript
import React, { useState, useMemo } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globals, Game } from '@/data/globals/globals';
import { LevelDataAtom } from '@/data/atoms/levelAtoms';
import { getBlankLevelConfig, createBlankLevel } from '@/data/blankLevel/registry';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface NewLevelDialogProps {
  open: boolean;
  onClose: () => void;
}

export const NewLevelDialog: React.FC<NewLevelDialogProps> = ({
  open,
  onClose,
}) => {
  const globals = useAtomValue(Globals);
  const setLevelData = useSetAtom(LevelDataAtom);

  // Form state
  const [mapWidth, setMapWidth] = useState<number>(64);
  const [mapHeight, setMapHeight] = useState<number>(64);
  const [levelName, setLevelName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Get config for current game
  const config = useMemo(() => {
    return getBlankLevelConfig(globals.GAME_TYPE);
  }, [globals.GAME_TYPE]);

  // Validate dimensions
  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (mapWidth < config.minWidth) {
      errors.push(`Width must be at least ${config.minWidth}`);
    }
    if (mapWidth > config.maxWidth) {
      errors.push(`Width cannot exceed ${config.maxWidth}`);
    }
    if (mapHeight < config.minHeight) {
      errors.push(`Height must be at least ${config.minHeight}`);
    }
    if (mapHeight > config.maxHeight) {
      errors.push(`Height cannot exceed ${config.maxHeight}`);
    }
    if (mapWidth % config.tilesPerSupertile !== 0) {
      errors.push(`Width must be divisible by ${config.tilesPerSupertile}`);
    }
    if (mapHeight % config.tilesPerSupertile !== 0) {
      errors.push(`Height must be divisible by ${config.tilesPerSupertile}`);
    }

    // Warnings
    if (mapWidth * mapHeight > 10000) {
      warnings.push('Large levels may impact performance');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }, [mapWidth, mapHeight, config]);

  // Handle create
  const handleCreate = () => {
    if (!validation.valid) {
      setError(validation.errors.join('; '));
      return;
    }

    const result = createBlankLevel(globals.GAME_TYPE, {
      mapWidth,
      mapHeight,
      levelName,
    });

    if (result.success && result.levelData) {
      setLevelData(result.levelData);
      onClose();
    } else {
      setError(result.error ?? 'Failed to create level');
    }
  };

  // Reset to defaults when game changes
  React.useEffect(() => {
    setMapWidth(config.defaultWidth);
    setMapHeight(config.defaultHeight);
    setError(null);
  }, [config]);

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Level</DialogTitle>
          <DialogDescription>
            Create a blank {globals.GAME_TYPE} level with the specified dimensions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Level name */}
          <div className="space-y-2">
            <Label htmlFor="levelName">Level Name (optional)</Label>
            <Input
              id="levelName"
              value={levelName}
              onChange={(e) => setLevelName(e.target.value)}
              placeholder="My New Level"
            />
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mapWidth">Width (tiles)</Label>
              <Input
                id="mapWidth"
                type="number"
                value={mapWidth}
                onChange={(e) => setMapWidth(Number(e.target.value))}
                min={config.minWidth}
                max={config.maxWidth}
                step={config.tilesPerSupertile}
              />
              <p className="text-xs text-muted-foreground">
                {config.minWidth}-{config.maxWidth}, step {config.tilesPerSupertile}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mapHeight">Height (tiles)</Label>
              <Input
                id="mapHeight"
                type="number"
                value={mapHeight}
                onChange={(e) => setMapHeight(Number(e.target.value))}
                min={config.minHeight}
                max={config.maxHeight}
                step={config.tilesPerSupertile}
              />
              <p className="text-xs text-muted-foreground">
                {config.minHeight}-{config.maxHeight}, step {config.tilesPerSupertile}
              </p>
            </div>
          </div>

          {/* Supertile info */}
          <p className="text-sm text-muted-foreground">
            Supertiles: {mapWidth / config.tilesPerSupertile} × {mapHeight / config.tilesPerSupertile}
            {' '}({(mapWidth / config.tilesPerSupertile) * (mapHeight / config.tilesPerSupertile)} total)
          </p>

          {/* Validation messages */}
          {validation.errors.length > 0 && (
            <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>{validation.errors.join('. ')}</div>
            </div>
          )}

          {validation.warnings.length > 0 && validation.valid && (
            <div className="flex items-start gap-2 p-2 bg-yellow-500/10 rounded text-yellow-600 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>{validation.warnings.join('. ')}</div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>{error}</div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!validation.valid}>
            Create Level
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

---

## Testing Strategy

### Unit Tests
- Test each game's blank level factory
- Verify array sizes match header dimensions
- Verify required resources are present

### Integration Tests
- Create blank level → Save → Reload → Verify structure
- Test that blank levels can be loaded by games

### Visual Tests
- Verify blank levels render correctly in editor

---

## File Summary

| File | Purpose |
|------|---------|
| `src/data/blankLevel/types.ts` | Type definitions |
| `src/data/blankLevel/levelFactoryUtils.ts` | Shared utility functions |
| `src/data/blankLevel/games/ottoMatic.ts` | Otto Matic factory |
| `src/data/blankLevel/games/bugdom.ts` | Bugdom 1 factory |
| `src/data/blankLevel/games/bugdom2.ts` | Bugdom 2 factory |
| `src/data/blankLevel/games/billyFrontier.ts` | Billy Frontier factory |
| `src/data/blankLevel/games/nanosaur.ts` | Nanosaur 1 factory |
| `src/data/blankLevel/games/nanosaur2.ts` | Nanosaur 2 factory |
| `src/data/blankLevel/games/croMag.ts` | Cro-Mag Rally factory |
| `src/data/blankLevel/games/mightyMike.ts` | Mighty Mike factory |
| `src/data/blankLevel/registry.ts` | Game registry |
| `src/editor/components/NewLevelDialog.tsx` | Create level UI |

---

## Implementation Order

1. **Phase 1**: Common utilities and types
2. **Phase 2**: Per-game factories (start with Otto Matic)
3. **Phase 3**: Registry and exports
4. **Phase 4**: UI components

---

## Risk Assessment

### Medium Risk
- Header field completeness (games may check for specific fields)
- Serialization compatibility (blank levels must serialize correctly)

### Low Risk
- Array size calculations are well-documented
- UI validation prevents invalid dimensions

### Mitigation
- Test created levels by loading in actual games
- Compare serialized blank levels to real levels for structure
