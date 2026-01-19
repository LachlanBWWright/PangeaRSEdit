# Tile Swap/Add Support for Tile-Based Games

## Overview

This plan describes implementing the ability to swap and add new tiles for the tile-based games: Bugdom 1, Billy Frontier, and Nanosaur 1. These games use individual 32x32 pixel tiles that are composed into supertiles, unlike the newer Pangea games that use pre-composed supertile textures.

## Problem Statement

### Current Limitations

The editor currently supports:
- Editing tile attributes (flags, parameters)
- Modifying terrain height (YCrd values)
- Viewing individual tiles

But it does NOT support:
- Replacing one tile with another tile from the tileset
- Adding new tiles to the tileset
- Removing unused tiles from the tileset
- Managing the tile-to-supertile mapping

### How Tile-Based Games Work

**Bugdom 1, Nanosaur 1, and Billy Frontier** use a tile-based terrain system:

1. **Tiles**: Individual 32x32 pixel textures stored in the resource file
2. **Tile Attributes (Atrb)**: Flags and parameters for each unique tile
3. **Tile Layer (Layr)**: 2D array mapping each map cell to a tile attribute index
4. **Translation Table (Xlat)**: Maps tile indices to actual texture data
5. **Supertiles**: 5x5 (Bugdom/Nanosaur) or 8x8 (Billy) tiles composed at runtime

The workflow:
```
Map Cell → Layr[index] → Atrb[attrIndex] → Xlat[tileIndex] → Tile Texture
```

### Data Structures

```typescript
// From the game files
interface TileAttribute {
  flags: number;  // Collision, properties, etc.
  p0: number;     // Game-specific parameter
  p1: number;     // Game-specific parameter
}

// Tile translation table
interface TileTranslation {
  idx: number;  // Index into the tile image data
}

// Terrain layer (maps cells to attributes)
type TerrainLayer = number[];  // Array of attribute indices
```

---

## Phase 1: Tile Data Analysis

### 1.1 Understand Existing Tile Structures

**File:** `frontend/src/data/tiles/tileStructures.ts`

```typescript
import { Game, DataType } from "@/data/globals/globals";

/**
 * Configuration for tile-based games
 */
export interface TileGameConfig {
  game: Game;
  tileSize: number;           // 32 pixels
  tilesPerSupertile: number;  // 5 for Bugdom/Nano, 8 for Billy
  maxTiles: number;           // Maximum unique tiles
  tileDataFormat: "16bit" | "24bit";
}

export const TILE_GAME_CONFIGS: Record<Game, TileGameConfig | null> = {
  [Game.BUGDOM]: {
    game: Game.BUGDOM,
    tileSize: 32,
    tilesPerSupertile: 5,
    maxTiles: 1024,  // Typical limit
    tileDataFormat: "16bit",
  },
  [Game.NANOSAUR]: {
    game: Game.NANOSAUR,
    tileSize: 32,
    tilesPerSupertile: 5,
    maxTiles: 1024,
    tileDataFormat: "16bit",
  },
  [Game.BILLY_FRONTIER]: {
    game: Game.BILLY_FRONTIER,
    tileSize: 32,
    tilesPerSupertile: 8,
    maxTiles: 2048,
    tileDataFormat: "16bit",
  },
  // Non-tile-based games
  [Game.OTTO_MATIC]: null,
  [Game.BUGDOM_2]: null,
  [Game.NANOSAUR_2]: null,
  [Game.CRO_MAG]: null,
  [Game.MIGHTY_MIKE]: null,
};

/**
 * Check if a game uses individual tiles
 */
export function isTileBasedGame(game: Game): boolean {
  return TILE_GAME_CONFIGS[game] !== null;
}
```

### 1.2 Tile Data Extraction

**File:** `frontend/src/data/tiles/tileDataExtractor.ts`

```typescript
import { TerrainData, LevelData } from "@/python/structSpecs/LevelTypes";
import { GlobalsInterface } from "@/data/globals/globals";

export interface TileInfo {
  index: number;          // Tile index in the tileset
  attributeIndex: number; // Index in Atrb array
  usageCount: number;     // How many times this tile is used on the map
  flags: number;
  p0: number;
  p1: number;
  imageData?: ImageData;  // Extracted tile image (32x32)
}

/**
 * Extract all unique tiles from level data
 */
export function extractTileInfo(
  levelData: LevelData,
  globals: GlobalsInterface,
): TileInfo[] {
  const tiles: TileInfo[] = [];
  
  const header = levelData.Hedr[1000].obj;
  const atrb = levelData.Atrb?.[1000]?.obj ?? [];
  const layr = levelData.Layr?.[1000]?.obj ?? [];
  const xlat = levelData.Xlat?.[1000]?.obj ?? [];
  
  // Count usage of each attribute
  const usageCounts = new Map<number, number>();
  for (const attrIndex of layr) {
    usageCounts.set(attrIndex, (usageCounts.get(attrIndex) ?? 0) + 1);
  }
  
  // Build tile info for each unique tile
  atrb.forEach((attr, attrIndex) => {
    const tileIndex = xlat[attrIndex]?.idx ?? attrIndex;
    tiles.push({
      index: tileIndex,
      attributeIndex: attrIndex,
      usageCount: usageCounts.get(attrIndex) ?? 0,
      flags: attr.flags,
      p0: attr.p0,
      p1: attr.p1,
    });
  });
  
  return tiles;
}

/**
 * Get tile usage statistics
 */
export function getTileUsageStats(
  levelData: LevelData,
  globals: GlobalsInterface,
): {
  totalTiles: number;
  usedTiles: number;
  unusedTiles: number;
  mostUsedTile: TileInfo | null;
  tileUsageDistribution: Map<number, number>;
} {
  const tiles = extractTileInfo(levelData, globals);
  const used = tiles.filter(t => t.usageCount > 0);
  
  return {
    totalTiles: tiles.length,
    usedTiles: used.length,
    unusedTiles: tiles.length - used.length,
    mostUsedTile: used.sort((a, b) => b.usageCount - a.usageCount)[0] ?? null,
    tileUsageDistribution: new Map(tiles.map(t => [t.index, t.usageCount])),
  };
}
```

---

## Phase 2: Tile Palette UI

### 2.1 Tile Palette Component

**File:** `frontend/src/editor/subviews/tiles/TilePalette.tsx`

```typescript
import React, { useMemo, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Globals } from "@/data/globals/globals";
import { extractTileInfo, TileInfo } from "@/data/tiles/tileDataExtractor";
import { isTileBasedGame } from "@/data/tiles/tileStructures";

interface TilePaletteProps {
  levelData: LevelData;
  tileImages: HTMLCanvasElement[];  // Decoded tile images
  onSelectTile: (tileInfo: TileInfo) => void;
  selectedTileIndex: number | null;
}

export const TilePalette: React.FC<TilePaletteProps> = ({
  levelData,
  tileImages,
  onSelectTile,
  selectedTileIndex,
}) => {
  const globals = useAtomValue(Globals);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"index" | "usage">("index");
  const [showUnusedOnly, setShowUnusedOnly] = useState(false);
  
  // Check if this game supports tile editing
  if (!isTileBasedGame(globals.GAME_TYPE)) {
    return (
      <div className="p-4 text-gray-400">
        Tile editing is not available for {globals.GAME_NAME}.
        This game uses pre-composed supertile textures.
      </div>
    );
  }
  
  const tiles = useMemo(
    () => extractTileInfo(levelData, globals),
    [levelData, globals]
  );
  
  // Filter and sort tiles
  const displayedTiles = useMemo(() => {
    let filtered = tiles;
    
    if (showUnusedOnly) {
      filtered = filtered.filter(t => t.usageCount === 0);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.index.toString().includes(query)
      );
    }
    
    return filtered.sort((a, b) => {
      if (sortBy === "usage") return b.usageCount - a.usageCount;
      return a.index - b.index;
    });
  }, [tiles, showUnusedOnly, searchQuery, sortBy]);
  
  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header / Controls */}
      <div className="p-3 border-b border-gray-700 space-y-2">
        <h3 className="text-lg font-semibold text-white">Tile Palette</h3>
        
        <input
          type="text"
          placeholder="Search by index..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 text-white rounded"
        />
        
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "index" | "usage")}
            className="px-2 py-1 bg-gray-800 text-white rounded text-sm"
          >
            <option value="index">Sort by Index</option>
            <option value="usage">Sort by Usage</option>
          </select>
          
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={showUnusedOnly}
              onChange={(e) => setShowUnusedOnly(e.target.checked)}
            />
            Unused only
          </label>
        </div>
        
        <div className="text-xs text-gray-400">
          {displayedTiles.length} tiles ({tiles.filter(t => t.usageCount > 0).length} in use)
        </div>
      </div>
      
      {/* Tile Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-8 gap-1">
          {displayedTiles.map((tile) => (
            <TileThumbnail
              key={tile.index}
              tile={tile}
              image={tileImages[tile.index]}
              isSelected={selectedTileIndex === tile.index}
              onClick={() => onSelectTile(tile)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const TileThumbnail: React.FC<{
  tile: TileInfo;
  image?: HTMLCanvasElement;
  isSelected: boolean;
  onClick: () => void;
}> = ({ tile, image, isSelected, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (canvasRef.current && image) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.drawImage(image, 0, 0, 32, 32);
      }
    }
  }, [image]);
  
  return (
    <button
      onClick={onClick}
      className={`
        relative w-10 h-10 border-2 rounded overflow-hidden
        ${isSelected ? "border-blue-500 ring-2 ring-blue-300" : "border-gray-700"}
        ${tile.usageCount === 0 ? "opacity-50" : ""}
        hover:border-blue-400 transition-colors
      `}
      title={`Tile ${tile.index} (used ${tile.usageCount}x)`}
    >
      <canvas ref={canvasRef} width={32} height={32} className="w-full h-full" />
      
      {/* Usage badge */}
      {tile.usageCount > 0 && (
        <span className="absolute bottom-0 right-0 px-1 bg-black/70 text-xs text-white">
          {tile.usageCount}
        </span>
      )}
    </button>
  );
};
```

### 2.2 Tile Selection State

**File:** `frontend/src/data/tiles/tileSelectionAtoms.ts`

```typescript
import { atom } from "jotai";
import { TileInfo } from "./tileDataExtractor";

/**
 * Currently selected tile in the palette
 */
export const SelectedPaletteTile = atom<TileInfo | null>(null);

/**
 * Tile painting mode
 */
export enum TilePaintMode {
  SELECT = "select",   // Select tiles on map
  PAINT = "paint",     // Paint selected tile
  EYEDROP = "eyedrop", // Pick tile from map
  FILL = "fill",       // Flood fill with selected tile
}

export const CurrentTilePaintMode = atom<TilePaintMode>(TilePaintMode.SELECT);

/**
 * Show tile grid overlay
 */
export const ShowTileGrid = atom<boolean>(true);

/**
 * Selected tiles on map (for multi-selection operations)
 */
export const SelectedMapTiles = atom<Set<number>>(new Set());
```

---

## Phase 3: Tile Painting Implementation

### 3.1 Tile Paint Handler

**File:** `frontend/src/data/tiles/tilePaintHandler.ts`

```typescript
import { LevelData } from "@/python/structSpecs/LevelTypes";
import { Updater } from "use-immer";
import { GlobalsInterface } from "@/data/globals/globals";
import { TileInfo } from "./tileDataExtractor";

export interface TilePaintResult {
  success: boolean;
  modifiedCells: number[];
  message?: string;
}

/**
 * Paint a tile at a specific map position
 */
export function paintTileAt(
  x: number,
  z: number,
  selectedTile: TileInfo,
  setLevelData: Updater<LevelData>,
  globals: GlobalsInterface,
): TilePaintResult {
  const result: TilePaintResult = { success: false, modifiedCells: [] };
  
  setLevelData((draft) => {
    const header = draft.Hedr[1000].obj;
    const layr = draft.Layr?.[1000]?.obj;
    
    if (!layr) {
      result.message = "No terrain layer data";
      return;
    }
    
    // Bounds check
    if (x < 0 || x >= header.mapWidth || z < 0 || z >= header.mapHeight) {
      result.message = "Position out of bounds";
      return;
    }
    
    const cellIndex = z * header.mapWidth + x;
    
    // Set the cell to use the selected tile's attribute index
    layr[cellIndex] = selectedTile.attributeIndex;
    
    result.success = true;
    result.modifiedCells.push(cellIndex);
  });
  
  return result;
}

/**
 * Paint tiles in a brush area
 */
export function paintTileBrush(
  centerX: number,
  centerZ: number,
  brushRadius: number,
  selectedTile: TileInfo,
  setLevelData: Updater<LevelData>,
  globals: GlobalsInterface,
): TilePaintResult {
  const result: TilePaintResult = { success: false, modifiedCells: [] };
  
  setLevelData((draft) => {
    const header = draft.Hedr[1000].obj;
    const layr = draft.Layr?.[1000]?.obj;
    
    if (!layr) {
      result.message = "No terrain layer data";
      return;
    }
    
    // Generate brush positions
    for (let dz = -brushRadius + 1; dz < brushRadius; dz++) {
      for (let dx = -brushRadius + 1; dx < brushRadius; dx++) {
        const x = centerX + dx;
        const z = centerZ + dz;
        
        // Bounds and radius check
        if (x < 0 || x >= header.mapWidth || z < 0 || z >= header.mapHeight) continue;
        if (Math.sqrt(dx * dx + dz * dz) > brushRadius) continue;
        
        const cellIndex = z * header.mapWidth + x;
        layr[cellIndex] = selectedTile.attributeIndex;
        result.modifiedCells.push(cellIndex);
      }
    }
    
    result.success = result.modifiedCells.length > 0;
  });
  
  return result;
}

/**
 * Flood fill from a position with selected tile
 */
export function floodFillTile(
  startX: number,
  startZ: number,
  selectedTile: TileInfo,
  setLevelData: Updater<LevelData>,
  globals: GlobalsInterface,
  maxFill = 10000,  // Safety limit
): TilePaintResult {
  const result: TilePaintResult = { success: false, modifiedCells: [] };
  
  setLevelData((draft) => {
    const header = draft.Hedr[1000].obj;
    const layr = draft.Layr?.[1000]?.obj;
    
    if (!layr) {
      result.message = "No terrain layer data";
      return;
    }
    
    const startIndex = startZ * header.mapWidth + startX;
    const targetAttrIndex = layr[startIndex];
    
    // Don't fill if already the same tile
    if (targetAttrIndex === selectedTile.attributeIndex) {
      result.message = "Already the same tile";
      return;
    }
    
    // Flood fill using BFS
    const queue: [number, number][] = [[startX, startZ]];
    const visited = new Set<number>();
    
    while (queue.length > 0 && result.modifiedCells.length < maxFill) {
      const [x, z] = queue.shift()!;
      const cellIndex = z * header.mapWidth + x;
      
      if (visited.has(cellIndex)) continue;
      if (x < 0 || x >= header.mapWidth || z < 0 || z >= header.mapHeight) continue;
      if (layr[cellIndex] !== targetAttrIndex) continue;
      
      visited.add(cellIndex);
      layr[cellIndex] = selectedTile.attributeIndex;
      result.modifiedCells.push(cellIndex);
      
      // Add neighbors
      queue.push([x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]);
    }
    
    result.success = result.modifiedCells.length > 0;
    if (result.modifiedCells.length >= maxFill) {
      result.message = `Fill limited to ${maxFill} tiles`;
    }
  });
  
  return result;
}

/**
 * Pick tile from map position (eyedropper)
 */
export function pickTileAt(
  x: number,
  z: number,
  levelData: LevelData,
  globals: GlobalsInterface,
): TileInfo | null {
  const header = levelData.Hedr[1000].obj;
  const layr = levelData.Layr?.[1000]?.obj;
  const atrb = levelData.Atrb?.[1000]?.obj;
  const xlat = levelData.Xlat?.[1000]?.obj;
  
  if (!layr || !atrb) return null;
  if (x < 0 || x >= header.mapWidth || z < 0 || z >= header.mapHeight) return null;
  
  const cellIndex = z * header.mapWidth + x;
  const attrIndex = layr[cellIndex];
  
  if (attrIndex === undefined || !atrb[attrIndex]) return null;
  
  const attr = atrb[attrIndex];
  const tileIndex = xlat?.[attrIndex]?.idx ?? attrIndex;
  
  return {
    index: tileIndex,
    attributeIndex: attrIndex,
    usageCount: layr.filter(i => i === attrIndex).length,
    flags: attr.flags,
    p0: attr.p0,
    p1: attr.p1,
  };
}
```

### 3.2 Integrate with Canvas View

**File:** `frontend/src/editor/canvas/Bugdom1KonvaView.tsx` (modifications)

```typescript
import { useAtom, useAtomValue } from "jotai";
import { 
  SelectedPaletteTile, 
  CurrentTilePaintMode, 
  TilePaintMode 
} from "@/data/tiles/tileSelectionAtoms";
import { paintTileAt, pickTileAt, floodFillTile } from "@/data/tiles/tilePaintHandler";

// Inside component
const [selectedTile, setSelectedTile] = useAtom(SelectedPaletteTile);
const paintMode = useAtomValue(CurrentTilePaintMode);

const handleCanvasClick = (x: number, z: number) => {
  switch (paintMode) {
    case TilePaintMode.PAINT:
      if (selectedTile) {
        paintTileAt(x, z, selectedTile, setLevelData, globals);
      }
      break;
      
    case TilePaintMode.EYEDROP:
      const pickedTile = pickTileAt(x, z, levelData, globals);
      if (pickedTile) {
        setSelectedTile(pickedTile);
      }
      break;
      
    case TilePaintMode.FILL:
      if (selectedTile) {
        floodFillTile(x, z, selectedTile, setLevelData, globals);
      }
      break;
  }
};
```

---

## Phase 4: Adding New Tiles

### 4.1 Tile Import System

**File:** `frontend/src/data/tiles/tileImport.ts`

```typescript
import { LevelData } from "@/python/structSpecs/LevelTypes";
import { Updater } from "use-immer";
import { GlobalsInterface } from "@/data/globals/globals";

export interface ImportTileResult {
  success: boolean;
  newTileIndex?: number;
  message?: string;
}

/**
 * Import a new tile from an image file
 */
export async function importTileFromImage(
  imageFile: File,
  setLevelData: Updater<LevelData>,
  globals: GlobalsInterface,
): Promise<ImportTileResult> {
  try {
    // Load and validate image
    const image = await loadImageFile(imageFile);
    
    if (image.width !== 32 || image.height !== 32) {
      return { 
        success: false, 
        message: `Image must be 32x32 pixels (got ${image.width}x${image.height})` 
      };
    }
    
    // Convert to 16-bit color data
    const tileData = convertTo16BitTileData(image);
    
    let newIndex = -1;
    
    setLevelData((draft) => {
      const atrb = draft.Atrb?.[1000]?.obj;
      const xlat = draft.Xlat?.[1000]?.obj;
      const timg = draft.Timg?.[1000];
      
      if (!atrb || !xlat || !timg) {
        return;
      }
      
      // Add new attribute entry
      newIndex = atrb.length;
      atrb.push({
        flags: 0,
        p0: 0,
        p1: 0,
      });
      
      // Add to translation table
      xlat.push({ idx: newIndex });
      
      // Append tile image data
      // The Timg data is base64-encoded 16-bit pixel data
      const existingData = atob(timg.data);
      const newData = existingData + String.fromCharCode(...tileData);
      timg.data = btoa(newData);
      
      // Update header
      const header = draft.Hedr[1000].obj;
      if ('numTiles' in header) {
        header.numTiles = atrb.length;
      }
    });
    
    return { success: true, newTileIndex: newIndex };
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Load image file as HTMLImageElement
 */
async function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert image to 16-bit tile data (5-5-5 RGB + 1 alpha)
 */
function convertTo16BitTileData(image: HTMLImageElement): Uint8Array {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, 32, 32);
  const pixels = imageData.data;
  
  // Convert to 16-bit (5-5-5 RGB)
  const output = new Uint8Array(32 * 32 * 2);
  
  for (let i = 0, j = 0; i < pixels.length; i += 4, j += 2) {
    const r = (pixels[i] >> 3) & 0x1F;      // 5 bits
    const g = (pixels[i + 1] >> 3) & 0x1F;  // 5 bits
    const b = (pixels[i + 2] >> 3) & 0x1F;  // 5 bits
    const a = pixels[i + 3] > 128 ? 1 : 0;  // 1 bit
    
    // Pack as 16-bit: ARRRRRGGGGGBBBBB (big endian)
    const packed = (a << 15) | (r << 10) | (g << 5) | b;
    output[j] = (packed >> 8) & 0xFF;
    output[j + 1] = packed & 0xFF;
  }
  
  return output;
}
```

### 4.2 Tile Import UI

**File:** `frontend/src/editor/subviews/tiles/TileImportDialog.tsx`

```typescript
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { importTileFromImage } from "@/data/tiles/tileImport";

interface TileImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  setLevelData: Updater<LevelData>;
  globals: GlobalsInterface;
}

export const TileImportDialog: React.FC<TileImportDialogProps> = ({
  isOpen,
  onClose,
  setLevelData,
  globals,
}) => {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  const onDrop = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    
    setImporting(true);
    setResult(null);
    
    for (const file of files) {
      const importResult = await importTileFromImage(file, setLevelData, globals);
      
      if (importResult.success) {
        setResult(`Imported tile as index ${importResult.newTileIndex}`);
      } else {
        setResult(`Error: ${importResult.message}`);
      }
    }
    
    setImporting(false);
  }, [setLevelData, globals]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".bmp"] },
  });
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-96">
        <h3 className="text-xl font-semibold text-white mb-4">Import Tile</h3>
        
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            ${isDragActive ? "border-blue-500 bg-blue-500/10" : "border-gray-600"}
          `}
        >
          <input {...getInputProps()} />
          {importing ? (
            <p className="text-gray-400">Importing...</p>
          ) : isDragActive ? (
            <p className="text-blue-400">Drop tile image here</p>
          ) : (
            <p className="text-gray-400">
              Drag & drop a 32x32 tile image, or click to select
            </p>
          )}
        </div>
        
        {result && (
          <p className={`mt-4 text-sm ${result.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
            {result}
          </p>
        )}
        
        <div className="mt-4 text-xs text-gray-500">
          <p>Requirements:</p>
          <ul className="list-disc pl-4">
            <li>Image must be exactly 32×32 pixels</li>
            <li>Supports PNG, JPG, or BMP format</li>
            <li>Alpha channel will be converted to 1-bit</li>
          </ul>
        </div>
        
        <button
          onClick={onClose}
          className="mt-6 w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
};
```

---

## Phase 5: Tile Removal and Optimization

### 5.1 Remove Unused Tiles

**File:** `frontend/src/data/tiles/tileOptimization.ts`

```typescript
import { LevelData } from "@/python/structSpecs/LevelTypes";
import { Updater } from "use-immer";
import { GlobalsInterface } from "@/data/globals/globals";
import { extractTileInfo } from "./tileDataExtractor";

export interface OptimizationResult {
  success: boolean;
  removedTiles: number;
  message?: string;
}

/**
 * Remove all unused tiles from the tileset
 */
export function removeUnusedTiles(
  setLevelData: Updater<LevelData>,
  globals: GlobalsInterface,
): OptimizationResult {
  const result: OptimizationResult = { success: false, removedTiles: 0 };
  
  setLevelData((draft) => {
    const atrb = draft.Atrb?.[1000]?.obj;
    const layr = draft.Layr?.[1000]?.obj;
    const xlat = draft.Xlat?.[1000]?.obj;
    const timg = draft.Timg?.[1000];
    
    if (!atrb || !layr || !xlat || !timg) {
      result.message = "Missing required data";
      return;
    }
    
    // Find used attribute indices
    const usedIndices = new Set(layr);
    
    // Build mapping from old index to new index
    const oldToNew = new Map<number, number>();
    let newIndex = 0;
    
    for (let i = 0; i < atrb.length; i++) {
      if (usedIndices.has(i)) {
        oldToNew.set(i, newIndex);
        newIndex++;
      }
    }
    
    const removedCount = atrb.length - oldToNew.size;
    if (removedCount === 0) {
      result.message = "No unused tiles to remove";
      return;
    }
    
    // Filter and remap attributes
    const newAtrb = atrb.filter((_, i) => usedIndices.has(i));
    const newXlat = xlat.filter((_, i) => usedIndices.has(i));
    
    // Remap layer indices
    for (let i = 0; i < layr.length; i++) {
      const newIdx = oldToNew.get(layr[i]);
      if (newIdx !== undefined) {
        layr[i] = newIdx;
      }
    }
    
    // Update data
    draft.Atrb[1000].obj = newAtrb;
    draft.Xlat[1000].obj = newXlat;
    
    // Update header
    const header = draft.Hedr[1000].obj;
    if ('numTiles' in header) {
      header.numTiles = newAtrb.length;
    }
    
    // Note: Timg data would also need reordering, which is complex
    // For now, mark as needing manual cleanup
    
    result.success = true;
    result.removedTiles = removedCount;
    result.message = `Removed ${removedCount} unused tiles`;
  });
  
  return result;
}
```

---

## File Summary

### New Files to Create

```
frontend/src/data/tiles/
├── tileStructures.ts         # Tile game configurations
├── tileDataExtractor.ts      # Extract tile info from level
├── tileSelectionAtoms.ts     # Selection/mode atoms
├── tilePaintHandler.ts       # Paint/fill operations
├── tileImport.ts             # Import new tiles
└── tileOptimization.ts       # Remove unused tiles

frontend/src/editor/subviews/tiles/
├── TilePalette.tsx           # Tile palette UI
├── TileImportDialog.tsx      # Import dialog
├── TileToolbar.tsx           # Mode selection toolbar
└── TileGrid.tsx              # Grid overlay component
```

### Files to Modify

```
frontend/src/editor/canvas/Bugdom1KonvaView.tsx
  - Add tile painting integration

frontend/src/editor/canvas/Nanosaur1KonvaView.tsx
  - Add tile painting integration

frontend/src/data/tiles/tileAtoms.ts
  - Add new tile editing atoms

frontend/src/editor/EditorToolbar.tsx
  - Add tile tools for tile-based games
```

---

## Implementation Order

1. **Phase 1**: Tile data analysis (3 hours)
2. **Phase 2**: Tile palette UI (4 hours)
3. **Phase 3**: Tile painting (4 hours)
4. **Phase 4**: Tile import (4 hours)
5. **Phase 5**: Tile optimization (2 hours)

**Total estimated effort**: 17 hours

---

## Testing Strategy

1. **Unit tests** for tile data extraction
2. **Unit tests** for paint operations
3. **Integration tests** for import flow
4. **Visual tests** comparing rendered tiles
5. **Roundtrip tests** (Plan 005) ensuring tile edits preserve level integrity

---

## Risk Assessment

### High Risk
- Modifying Timg (tile image data) could corrupt level files
- Index remapping errors could break the layer

### Medium Risk
- Performance with large tilesets
- Color conversion accuracy

### Low Risk
- UI changes are isolated
- Existing functionality preserved

---

## Success Criteria

1. Users can select tiles from palette and paint on map
2. Flood fill works correctly for contiguous areas
3. New tiles can be imported from images
4. Unused tiles can be removed
5. Edited levels load correctly in original games
