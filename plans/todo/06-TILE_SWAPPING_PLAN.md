# Tile Swapping and Adding for Tile-Based Games Plan

## Overview

This plan outlines the implementation of tile management features for the tile-based games: Bugdom 1, Billy Frontier, and Nanosaur 1. These games use individual tile textures (as opposed to supertiles) that can be swapped and new tiles can be added.

---

## Current State Analysis

### Game Tile Architectures

| Game | Tile System | Tile Size | File Format |
|------|-------------|-----------|-------------|
| Bugdom 1 | Individual tiles in `Layr` | 5×5 per supertile | Resource fork (PICT) |
| Billy Frontier | Individual tiles in `Layr` | 8×8 per supertile | Resource fork |
| Nanosaur 1 | Texture layer array | 5×5 per supertile | Binary .ter file |

### Existing Infrastructure

| Component | File | Status |
|-----------|------|--------|
| Tile rendering | `src/editor/subviews/tiles/TilesView.tsx` | Read-only display |
| Tile data | `src/data/selectors/tileSelectors.ts` | Basic selectors |
| Level data types | `src/python/structSpecs/LevelTypes.ts` | Type definitions |
| PICT parsing | `src/parsers/pictParser.ts` | Partial |

### Current Tile Data Structures

```typescript
// Bugdom 1 / Billy Frontier - Layr structure
interface LayerTile {
  tileId: number;      // Index into tile page
  flipH: boolean;      // Horizontal flip
  flipV: boolean;      // Vertical flip
  rotCW: number;       // Rotation clockwise (0, 90, 180, 270)
}

// Nanosaur 1 - textureLayer
interface NanosaurTextureLayer {
  textureIndex: number;  // Index into texture array
  // Flip/rotate encoded in bits
}
```

---

## Implementation Plan

### Phase 1: Tile Data Management

#### 1.1 Tile Management Types

**File:** `src/data/tiles/tileTypes.ts`

```typescript
/**
 * Represents a single tile definition
 */
export interface TileDefinition {
  /** Unique ID within the tileset */
  id: number;
  /** Display name */
  name?: string;
  /** Texture data (RGBA) */
  textureData: Uint8Array;
  /** Texture width */
  width: number;
  /** Texture height */
  height: number;
  /** Whether this tile is used in the level */
  inUse: boolean;
  /** Number of times this tile appears in the level */
  useCount: number;
}

/**
 * A placed tile on the map
 */
export interface PlacedTile {
  /** X coordinate in tiles */
  x: number;
  /** Z coordinate in tiles */
  z: number;
  /** Tile definition ID */
  tileId: number;
  /** Transform flags */
  flipH: boolean;
  flipV: boolean;
  rotation: 0 | 90 | 180 | 270;
}

/**
 * Complete tileset for a level
 */
export interface Tileset {
  /** Game this tileset belongs to */
  game: 'bugdom' | 'billyFrontier' | 'nanosaur';
  /** All tile definitions */
  tiles: TileDefinition[];
  /** Next available tile ID */
  nextId: number;
  /** Tile dimensions */
  tileWidth: number;
  tileHeight: number;
}

/**
 * Tile operation result
 */
export interface TileOpResult<T = void> {
  success: boolean;
  value?: T;
  error?: string;
}
```

#### 1.2 Tile Extraction

**File:** `src/data/tiles/tileExtractor.ts`

```typescript
import type { LevelData } from '@/python/structSpecs/LevelTypes';
import type { TileDefinition, Tileset } from './tileTypes';
import { Game } from '@/data/globals/globals';

/**
 * Extract tileset from Bugdom 1 level data
 */
export function extractBugdomTileset(levelData: LevelData): Tileset {
  const tiles: TileDefinition[] = [];
  
  // Bugdom stores tiles in PICT resources
  // Each PICT resource is a tile page containing multiple tiles
  const pictData = levelData.PICT;
  
  if (pictData) {
    Object.entries(pictData).forEach(([key, pict]) => {
      // Parse PICT to extract individual tiles
      // Each PICT is a tile page (e.g., 16 tiles in a 4x4 grid)
      const pageIndex = Number(key) - 1000;
      const tileImages = parsePICTToTiles(pict.data, 32, 32); // 32x32 tiles
      
      tileImages.forEach((imageData, tileIndex) => {
        tiles.push({
          id: pageIndex * 16 + tileIndex,
          textureData: imageData,
          width: 32,
          height: 32,
          inUse: false,
          useCount: 0,
        });
      });
    });
  }

  // Count tile usage from Layr data
  const layerData = levelData.Layr?.[1000]?.obj;
  if (layerData && Array.isArray(layerData)) {
    for (const tile of layerData) {
      const tileId = extractTileId(tile);
      const tileDef = tiles.find(t => t.id === tileId);
      if (tileDef) {
        tileDef.inUse = true;
        tileDef.useCount++;
      }
    }
  }

  return {
    game: 'bugdom',
    tiles,
    nextId: tiles.length,
    tileWidth: 32,
    tileHeight: 32,
  };
}

/**
 * Extract tileset from Billy Frontier level data
 */
export function extractBillyFrontierTileset(levelData: LevelData): Tileset {
  const tiles: TileDefinition[] = [];
  
  // Similar to Bugdom but different PICT organization
  // Billy Frontier uses larger tile pages
  
  const pictData = levelData.PICT;
  if (pictData) {
    Object.entries(pictData).forEach(([key, pict]) => {
      const pageIndex = Number(key) - 1000;
      const tileImages = parsePICTToTiles(pict.data, 32, 32);
      
      tileImages.forEach((imageData, tileIndex) => {
        tiles.push({
          id: pageIndex * 256 + tileIndex, // Billy uses larger pages
          textureData: imageData,
          width: 32,
          height: 32,
          inUse: false,
          useCount: 0,
        });
      });
    });
  }

  return {
    game: 'billyFrontier',
    tiles,
    nextId: tiles.length,
    tileWidth: 32,
    tileHeight: 32,
  };
}

/**
 * Extract tileset from Nanosaur 1 level data
 */
export function extractNanosaurTileset(
  textureData: Uint8Array[],
  textureWidth: number,
  textureHeight: number
): Tileset {
  const tiles: TileDefinition[] = textureData.map((data, index) => ({
    id: index,
    textureData: data,
    width: textureWidth,
    height: textureHeight,
    inUse: false,
    useCount: 0,
  }));

  return {
    game: 'nanosaur',
    tiles,
    nextId: tiles.length,
    tileWidth: textureWidth,
    tileHeight: textureHeight,
  };
}

/**
 * Parse PICT data into individual tile textures
 */
function parsePICTToTiles(
  pictData: Uint8Array,
  tileWidth: number,
  tileHeight: number
): Uint8Array[] {
  // PICT parsing logic
  // Returns array of RGBA data for each tile
  // Implementation depends on PICT format details
  const tiles: Uint8Array[] = [];
  
  // TODO: Implement PICT parsing
  // This involves:
  // 1. Parse PICT header to get image dimensions
  // 2. Decompress/decode image data
  // 3. Split into tileWidth x tileHeight chunks
  
  return tiles;
}

function extractTileId(tileData: unknown): number {
  // Extract tile ID from layer data
  // Format varies by game
  if (typeof tileData === 'number') {
    return tileData & 0x0FFF; // Lower 12 bits for tile ID
  }
  return 0;
}
```

### Phase 2: Tile Manipulation Operations

#### 2.1 Tile Operations

**File:** `src/data/tiles/tileOps.ts`

```typescript
import type { LevelData } from '@/python/structSpecs/LevelTypes';
import type { Tileset, TileDefinition, PlacedTile, TileOpResult } from './tileTypes';

/**
 * Set a tile at a specific map position
 */
export function setTile(
  levelData: LevelData,
  mapWidth: number,
  x: number,
  z: number,
  tileId: number,
  flipH: boolean = false,
  flipV: boolean = false,
  rotation: 0 | 90 | 180 | 270 = 0
): TileOpResult<{ levelData: LevelData }> {
  const layerData = levelData.Layr?.[1000]?.obj;
  if (!layerData || !Array.isArray(layerData)) {
    return { success: false, error: 'No layer data' };
  }

  const idx = z * mapWidth + x;
  if (idx < 0 || idx >= layerData.length) {
    return { success: false, error: 'Invalid tile coordinates' };
  }

  // Encode tile ID with flip/rotation flags
  const encodedTile = encodeTileValue(tileId, flipH, flipV, rotation);
  
  const newLayerData = [...layerData];
  newLayerData[idx] = encodedTile;

  const newLevelData = {
    ...levelData,
    Layr: {
      ...levelData.Layr,
      1000: {
        ...levelData.Layr?.[1000],
        obj: newLayerData,
      },
    },
  };

  return {
    success: true,
    value: { levelData: newLevelData },
  };
}

/**
 * Get the tile at a specific position
 */
export function getTile(
  levelData: LevelData,
  mapWidth: number,
  x: number,
  z: number
): TileOpResult<PlacedTile> {
  const layerData = levelData.Layr?.[1000]?.obj;
  if (!layerData || !Array.isArray(layerData)) {
    return { success: false, error: 'No layer data' };
  }

  const idx = z * mapWidth + x;
  if (idx < 0 || idx >= layerData.length) {
    return { success: false, error: 'Invalid tile coordinates' };
  }

  const tileValue = layerData[idx];
  const { tileId, flipH, flipV, rotation } = decodeTileValue(tileValue);

  return {
    success: true,
    value: {
      x,
      z,
      tileId,
      flipH,
      flipV,
      rotation,
    },
  };
}

/**
 * Swap all occurrences of one tile with another
 */
export function swapTiles(
  levelData: LevelData,
  fromTileId: number,
  toTileId: number
): TileOpResult<{ levelData: LevelData; swapCount: number }> {
  const layerData = levelData.Layr?.[1000]?.obj;
  if (!layerData || !Array.isArray(layerData)) {
    return { success: false, error: 'No layer data' };
  }

  let swapCount = 0;
  const newLayerData = layerData.map(tileValue => {
    const decoded = decodeTileValue(tileValue);
    if (decoded.tileId === fromTileId) {
      swapCount++;
      return encodeTileValue(toTileId, decoded.flipH, decoded.flipV, decoded.rotation);
    }
    return tileValue;
  });

  const newLevelData = {
    ...levelData,
    Layr: {
      ...levelData.Layr,
      1000: {
        ...levelData.Layr?.[1000],
        obj: newLayerData,
      },
    },
  };

  return {
    success: true,
    value: { levelData: newLevelData, swapCount },
  };
}

/**
 * Fill a rectangular area with a tile
 */
export function fillTileArea(
  levelData: LevelData,
  mapWidth: number,
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
  tileId: number,
  flipH: boolean = false,
  flipV: boolean = false,
  rotation: 0 | 90 | 180 | 270 = 0
): TileOpResult<{ levelData: LevelData }> {
  const layerData = levelData.Layr?.[1000]?.obj;
  if (!layerData || !Array.isArray(layerData)) {
    return { success: false, error: 'No layer data' };
  }

  const encodedTile = encodeTileValue(tileId, flipH, flipV, rotation);
  const newLayerData = [...layerData];

  const minX = Math.min(startX, endX);
  const maxX = Math.max(startX, endX);
  const minZ = Math.min(startZ, endZ);
  const maxZ = Math.max(startZ, endZ);

  for (let z = minZ; z <= maxZ; z++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = z * mapWidth + x;
      if (idx >= 0 && idx < newLayerData.length) {
        newLayerData[idx] = encodedTile;
      }
    }
  }

  const newLevelData = {
    ...levelData,
    Layr: {
      ...levelData.Layr,
      1000: {
        ...levelData.Layr?.[1000],
        obj: newLayerData,
      },
    },
  };

  return {
    success: true,
    value: { levelData: newLevelData },
  };
}

/**
 * Encode tile ID and flags into storage format
 */
function encodeTileValue(
  tileId: number,
  flipH: boolean,
  flipV: boolean,
  rotation: 0 | 90 | 180 | 270
): number {
  // Format: bits 0-11: tile ID, bit 12: flipH, bit 13: flipV, bits 14-15: rotation
  let value = tileId & 0x0FFF;
  if (flipH) value |= 0x1000;
  if (flipV) value |= 0x2000;
  value |= (rotation / 90) << 14;
  return value;
}

/**
 * Decode tile value into components
 */
function decodeTileValue(value: number): {
  tileId: number;
  flipH: boolean;
  flipV: boolean;
  rotation: 0 | 90 | 180 | 270;
} {
  const tileId = value & 0x0FFF;
  const flipH = (value & 0x1000) !== 0;
  const flipV = (value & 0x2000) !== 0;
  const rotationIndex = (value >> 14) & 0x03;
  const rotation = (rotationIndex * 90) as 0 | 90 | 180 | 270;
  
  return { tileId, flipH, flipV, rotation };
}
```

### Phase 3: Add New Tiles

#### 3.1 Tile Addition

**File:** `src/data/tiles/tileAddition.ts`

```typescript
import type { LevelData } from '@/python/structSpecs/LevelTypes';
import type { Tileset, TileDefinition, TileOpResult } from './tileTypes';

/**
 * Add a new tile to the tileset
 */
export function addNewTile(
  levelData: LevelData,
  tileset: Tileset,
  textureData: Uint8Array,
  width: number,
  height: number,
  name?: string
): TileOpResult<{ levelData: LevelData; tileset: Tileset; newTileId: number }> {
  if (width !== tileset.tileWidth || height !== tileset.tileHeight) {
    return {
      success: false,
      error: `Tile dimensions must be ${tileset.tileWidth}x${tileset.tileHeight}`,
    };
  }

  // Create new tile definition
  const newTile: TileDefinition = {
    id: tileset.nextId,
    name,
    textureData,
    width,
    height,
    inUse: false,
    useCount: 0,
  };

  // Update tileset
  const newTileset: Tileset = {
    ...tileset,
    tiles: [...tileset.tiles, newTile],
    nextId: tileset.nextId + 1,
  };

  // Update level data with new tile texture
  // This depends on the game's storage format
  const newLevelData = addTileToLevelData(levelData, newTile, tileset.game);

  return {
    success: true,
    value: {
      levelData: newLevelData,
      tileset: newTileset,
      newTileId: newTile.id,
    },
  };
}

/**
 * Add tile texture data to level data (game-specific)
 */
function addTileToLevelData(
  levelData: LevelData,
  tile: TileDefinition,
  game: string
): LevelData {
  switch (game) {
    case 'bugdom':
    case 'billyFrontier':
      return addTileToPICT(levelData, tile);
    case 'nanosaur':
      return addTileToTextureArray(levelData, tile);
    default:
      return levelData;
  }
}

/**
 * Add tile to PICT resource (Bugdom/Billy Frontier)
 */
function addTileToPICT(levelData: LevelData, tile: TileDefinition): LevelData {
  // Calculate which PICT page this tile belongs to
  const tilesPerPage = 16; // 4x4 grid
  const pageIndex = Math.floor(tile.id / tilesPerPage);
  const tileIndexInPage = tile.id % tilesPerPage;
  
  const pictKey = 1000 + pageIndex;
  
  // Get existing PICT data or create new
  let pictData = levelData.PICT?.[pictKey]?.data;
  if (!pictData) {
    // Create new PICT page
    pictData = createEmptyPICTPage(tile.width * 4, tile.height * 4);
  }

  // Insert tile into PICT at correct position
  const newPictData = insertTileIntoPICT(
    pictData,
    tile.textureData,
    tileIndexInPage,
    tile.width,
    tile.height
  );

  return {
    ...levelData,
    PICT: {
      ...levelData.PICT,
      [pictKey]: {
        ...levelData.PICT?.[pictKey],
        data: newPictData,
      },
    },
  };
}

/**
 * Add tile to texture array (Nanosaur 1)
 */
function addTileToTextureArray(levelData: LevelData, tile: TileDefinition): LevelData {
  // Nanosaur stores textures directly in a binary array
  // Need to append new texture data
  
  // This would modify the texture layer section of the .ter file
  // Implementation depends on the exact binary format
  
  return levelData;
}

function createEmptyPICTPage(width: number, height: number): Uint8Array {
  // Create empty PICT with transparent pixels
  // PICT format header + image data
  return new Uint8Array(0); // TODO: Implement
}

function insertTileIntoPICT(
  pictData: Uint8Array,
  tileData: Uint8Array,
  tileIndex: number,
  tileWidth: number,
  tileHeight: number
): Uint8Array {
  // Insert tile texture into PICT at correct position
  // TODO: Implement PICT modification
  return pictData;
}
```

### Phase 4: Tile Editor UI

#### 4.1 Tile Palette Component

**File:** `src/editor/subviews/tiles/TilePalette.tsx`

```typescript
import React, { useMemo, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { Globals } from '@/data/globals/globals';
import { LevelDataAtom } from '@/data/atoms/levelAtoms';
import type { TileDefinition } from '@/data/tiles/tileTypes';
import { extractBugdomTileset, extractBillyFrontierTileset } from '@/data/tiles/tileExtractor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';

interface TilePaletteProps {
  onSelectTile: (tileId: number) => void;
  selectedTileId?: number;
}

export const TilePalette: React.FC<TilePaletteProps> = ({
  onSelectTile,
  selectedTileId,
}) => {
  const globals = useAtomValue(Globals);
  const levelData = useAtomValue(LevelDataAtom);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUsedOnly, setShowUsedOnly] = useState(false);

  // Extract tileset from level data
  const tileset = useMemo(() => {
    if (!levelData) return null;
    
    switch (globals.GAME_TYPE) {
      case 'BUGDOM':
        return extractBugdomTileset(levelData);
      case 'BILLY_FRONTIER':
        return extractBillyFrontierTileset(levelData);
      // Nanosaur would need different extraction
      default:
        return null;
    }
  }, [levelData, globals.GAME_TYPE]);

  // Filter tiles
  const filteredTiles = useMemo(() => {
    if (!tileset) return [];
    
    return tileset.tiles.filter(tile => {
      if (showUsedOnly && !tile.inUse) return false;
      if (searchTerm && tile.name && !tile.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [tileset, showUsedOnly, searchTerm]);

  if (!tileset) {
    return (
      <div className="p-4 text-muted-foreground">
        Tile palette not available for this game
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-2 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tiles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-2 py-1 text-sm border rounded"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={showUsedOnly}
              onChange={(e) => setShowUsedOnly(e.target.checked)}
            />
            Used only
          </label>
          <span className="text-xs text-muted-foreground">
            {filteredTiles.length} tiles
          </span>
        </div>
      </div>

      {/* Tile grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-4 gap-1 p-2">
          {filteredTiles.map((tile) => (
            <TileThumbnail
              key={tile.id}
              tile={tile}
              isSelected={tile.id === selectedTileId}
              onClick={() => onSelectTile(tile.id)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Add new tile button */}
      <div className="p-2 border-t">
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add New Tile
        </Button>
      </div>
    </div>
  );
};

interface TileThumbnailProps {
  tile: TileDefinition;
  isSelected: boolean;
  onClick: () => void;
}

const TileThumbnail: React.FC<TileThumbnailProps> = ({
  tile,
  isSelected,
  onClick,
}) => {
  // Create canvas for tile preview
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Render tile texture to canvas
    const imageData = ctx.createImageData(tile.width, tile.height);
    imageData.data.set(tile.textureData);
    ctx.putImageData(imageData, 0, 0);
  }, [tile]);

  return (
    <button
      onClick={onClick}
      className={`
        relative aspect-square border rounded overflow-hidden
        hover:border-primary transition-colors
        ${isSelected ? 'border-primary ring-2 ring-primary' : 'border-border'}
      `}
      title={`Tile ${tile.id}${tile.name ? `: ${tile.name}` : ''}`}
    >
      <canvas
        ref={canvasRef}
        width={tile.width}
        height={tile.height}
        className="w-full h-full object-contain"
      />
      {tile.inUse && (
        <div className="absolute bottom-0 right-0 bg-green-500 text-white text-xs px-1">
          {tile.useCount}
        </div>
      )}
    </button>
  );
};
```

#### 4.2 Tile Swap Dialog

**File:** `src/editor/subviews/tiles/TileSwapDialog.tsx`

```typescript
import React, { useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LevelDataAtom } from '@/data/atoms/levelAtoms';
import { swapTiles } from '@/data/tiles/tileOps';
import { TilePalette } from './TilePalette';
import { ArrowRight } from 'lucide-react';

interface TileSwapDialogProps {
  open: boolean;
  onClose: () => void;
}

export const TileSwapDialog: React.FC<TileSwapDialogProps> = ({
  open,
  onClose,
}) => {
  const [levelData, setLevelData] = useAtom(LevelDataAtom);
  const [fromTileId, setFromTileId] = useState<number | null>(null);
  const [toTileId, setToTileId] = useState<number | null>(null);
  const [selectingFor, setSelectingFor] = useState<'from' | 'to'>('from');

  const handleSwap = () => {
    if (fromTileId === null || toTileId === null || !levelData) return;

    const result = swapTiles(levelData, fromTileId, toTileId);
    if (result.success && result.value) {
      setLevelData(result.value.levelData);
      alert(`Swapped ${result.value.swapCount} tiles`);
      onClose();
    } else {
      alert(`Swap failed: ${result.error}`);
    }
  };

  const handleSelectTile = (tileId: number) => {
    if (selectingFor === 'from') {
      setFromTileId(tileId);
      setSelectingFor('to');
    } else {
      setToTileId(tileId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Swap Tiles</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Selection display */}
          <div className="flex flex-col items-center justify-center gap-4 px-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">From</div>
              <div
                className={`w-16 h-16 border-2 rounded flex items-center justify-center cursor-pointer
                  ${selectingFor === 'from' ? 'border-primary' : 'border-border'}
                  ${fromTileId !== null ? 'bg-accent' : ''}
                `}
                onClick={() => setSelectingFor('from')}
              >
                {fromTileId !== null ? `#${fromTileId}` : 'Select'}
              </div>
            </div>

            <ArrowRight className="h-6 w-6 text-muted-foreground" />

            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">To</div>
              <div
                className={`w-16 h-16 border-2 rounded flex items-center justify-center cursor-pointer
                  ${selectingFor === 'to' ? 'border-primary' : 'border-border'}
                  ${toTileId !== null ? 'bg-accent' : ''}
                `}
                onClick={() => setSelectingFor('to')}
              >
                {toTileId !== null ? `#${toTileId}` : 'Select'}
              </div>
            </div>
          </div>

          {/* Tile palette */}
          <div className="flex-1 border rounded overflow-hidden">
            <TilePalette
              onSelectTile={handleSelectTile}
              selectedTileId={selectingFor === 'from' ? fromTileId ?? undefined : toTileId ?? undefined}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSwap}
            disabled={fromTileId === null || toTileId === null}
          >
            Swap Tiles
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
- Test tile encoding/decoding
- Test swap operations
- Test fill operations

### Integration Tests
- Load real level files
- Swap tiles
- Verify correct positions changed

### Visual Tests
- Verify tile rendering
- Test palette UI

---

## File Summary

| File | Purpose |
|------|---------|
| `src/data/tiles/tileTypes.ts` | Type definitions |
| `src/data/tiles/tileExtractor.ts` | Extract tiles from level data |
| `src/data/tiles/tileOps.ts` | Tile manipulation operations |
| `src/data/tiles/tileAddition.ts` | Add new tiles |
| `src/editor/subviews/tiles/TilePalette.tsx` | Tile selection UI |
| `src/editor/subviews/tiles/TileSwapDialog.tsx` | Swap tiles dialog |

---

## Implementation Order

1. **Phase 1**: Tile data types and extraction
2. **Phase 2**: Basic tile operations (set, get, swap)
3. **Phase 3**: Add new tile functionality
4. **Phase 4**: UI components

---

## Risk Assessment

### High Risk
- PICT format parsing complexity
- Binary format variations between games

### Medium Risk
- Tile encoding/decoding correctness
- Performance with large tilesets

### Mitigation
- Extensive testing with real level files
- Fallback to read-only mode if modification fails
