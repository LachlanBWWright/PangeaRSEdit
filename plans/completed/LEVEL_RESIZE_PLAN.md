# Level Resize Feature - Implementation Plan

This document outlines the plan for implementing level size extension by adding new supertile rows/columns.

## Executive Summary

Extending level sizes requires updating multiple interdependent data structures that vary by game. The most complex aspects are:
1. **YCrd (heightmap) arrays** - sized as `(mapWidth + 1) × (mapHeight + 1)`, requiring careful 2D array manipulation
2. **Header structures** - game-specific fields and constraints
3. **Game-specific data formats** - Nanosaur 1 and Mighty Mike have fundamentally different structures

---

## Table of Contents

1. [Games Overview](#games-overview)
2. [Data Structures Requiring Updates](#data-structures-requiring-updates)
3. [YCrd Heightmap Refactoring](#ycrd-heightmap-refactoring)
4. [Game-Specific Considerations](#game-specific-considerations)
5. [Implementation Strategy](#implementation-strategy)
6. [Validation Requirements](#validation-requirements)
7. [UI Considerations](#ui-considerations)

---

## Games Overview

### Supported Games and Their Formats

| Game | Data Type | TILES_PER_SUPERTILE | Header Format | Heightmap Format |
|------|-----------|---------------------|---------------|------------------|
| Otto Matic | STANDARD | 8 | Full (numTilePages/numTiles) | YCrd 1000 |
| Bugdom | RSRC_FORK | 5 | Full | YCrd 1000 + 1001 (roof) |
| Bugdom 2 | STANDARD | 8 | Simplified | YCrd 1000 |
| Nanosaur | TRT_FILE | 5 | Proprietary | Binary heightmapLayer |
| Nanosaur 2 | STANDARD | 8 | Simplified | YCrd 1000 |
| Cro-Mag Rally | STANDARD | 8 | Full (numPaths) | YCrd 1000 |
| Billy Frontier | STANDARD | 8 | Simplified | YCrd 1000 |
| Mighty Mike | MIGHTY_MIKE | 1 (no supertiles) | Custom | N/A (2D tilemap) |

### Critical Constraint

**Map dimensions MUST be divisible by TILES_PER_SUPERTILE**
- For most games: mapWidth % 8 === 0 && mapHeight % 8 === 0
- For Bugdom/Nanosaur 1: mapWidth % 5 === 0 && mapHeight % 5 === 0

---

## Data Structures Requiring Updates

### 1. Header (`Hedr`)

**Location:** `src/python/structSpecs/gameLevelTypes.ts`, `src/python/structSpecs/LevelTypes.ts`

#### Fields to Update
```typescript
// All games
mapWidth: number;   // Must update
mapHeight: number;  // Must update

// Full format (Otto Matic, Bugdom 1, Cro-Mag Rally)
numTilePages: number;  // May need recalculation
numTiles: number;      // May need recalculation
```

#### Header Types by Game
- **OttoMaticHeader / CroMagHeader**: Full format with numTilePages, numTiles, numUniqueSupertiles
- **Bugdom2Header / Nanosaur2Header / BillyFrontierHeader**: Simplified format (no numTilePages/numTiles)
- **BugdomHeader**: Full format with integer types
- **NanosaurHeader**: Proprietary with width/depth fields

### 2. YCrd (Heightmap Data)

**Location:** `LevelData.YCrd[1000].obj` (and optionally `[1001]` for roof)

**Current Size Formula:**
```typescript
yCrdLength = (mapWidth + 1) × (mapHeight + 1)
```

**Index Calculation:**
```typescript
// From src/editor/threejs/fenceUtils/flattenCoords.ts
index = zTile * (mapWidth + 1) + xTile
```

**Key Files:**
- `src/editor/threejs/fenceUtils/flattenCoords.ts`
- `src/editor/threejs/fenceUtils/getHeightAtTile.ts`
- `src/editor/utils/topologyBrushUtils.ts`

### 3. Atrb (Tile Attributes)

**Location:** `LevelData.Atrb[1000].obj`

**Size:** `mapWidth × mapHeight`

**Types:**
- Standard: `{ flags, p0, p1 }`
- Extended (Bugdom 1, Nanosaur 1): `{ bits, parm0, parm1, parm2, undefined, flags, p0, p1 }`

### 4. STgd (Supertile Grid)

**Location:** `LevelData.STgd[1000].obj`

**Size:**
```typescript
stgdLength = (mapWidth / TILES_PER_SUPERTILE) × (mapHeight / TILES_PER_SUPERTILE)
```

**Types:**
- `OttoMaticSupertileGrid`: `{ isEmpty: boolean, superTileId: number }`
- `Bugdom2SupertileGrid`: `{ superTileId: number }` (-1 = empty)

### 5. Layr (Tile Layer) - Bugdom 1 / Nanosaur 1 Only

**Location:** `LevelData.Layr[1000].obj`

**Size:** `mapWidth × mapHeight`

Contains individual tile references with flip/rotate bits.

### 6. ItCo (Item Colors)

**Location:** `LevelData.ItCo[1000].data`

This is hex data that correlates with terrain. May need resizing depending on how it's used.

### 7. Items (Itms)

**Location:** `LevelData.Itms[1000].obj`

Items are **NOT** grid-based but have x/z coordinates. When shrinking a level:
- Items outside new bounds must be handled (delete, clamp, or warn)

---

## YCrd Heightmap Refactoring

This is the most complex aspect due to the `+1` dimension requirement.

### Current Array Layout

```
For a 64×64 tile map, YCrd is 65×65 = 4225 elements
Stored as 1D array, indexed by: z * (mapWidth + 1) + x

Visual representation (5×5 tile map = 6×6 height points):
    x=0  x=1  x=2  x=3  x=4  x=5
z=0  [0]  [1]  [2]  [3]  [4]  [5]
z=1  [6]  [7]  [8]  [9]  [10] [11]
z=2  [12] [13] [14] [15] [16] [17]
z=3  [18] [19] [20] [21] [22] [23]
z=4  [24] [25] [26] [27] [28] [29]
z=5  [30] [31] [32] [33] [34] [35]
```

### Resize Operations

#### Expanding Width (Adding Columns on Right)

```typescript
function expandYCrdWidth(
  oldArray: number[],
  oldWidth: number,
  oldHeight: number,
  addColumns: number,
  defaultHeight: number
): number[] {
  const newWidth = oldWidth + addColumns;
  const oldStride = oldWidth + 1;
  const newStride = newWidth + 1;
  const newArray = new Array((newWidth + 1) * (oldHeight + 1));

  for (let z = 0; z <= oldHeight; z++) {
    // Copy existing row
    for (let x = 0; x <= oldWidth; x++) {
      newArray[z * newStride + x] = oldArray[z * oldStride + x];
    }
    // Fill new columns with default or edge value
    const edgeValue = oldArray[z * oldStride + oldWidth];
    for (let x = oldWidth + 1; x <= newWidth; x++) {
      newArray[z * newStride + x] = edgeValue; // or defaultHeight
    }
  }
  return newArray;
}
```

#### Expanding Height (Adding Rows on Bottom)

```typescript
function expandYCrdHeight(
  oldArray: number[],
  oldWidth: number,
  oldHeight: number,
  addRows: number,
  defaultHeight: number
): number[] {
  const newHeight = oldHeight + addRows;
  const stride = oldWidth + 1;
  const newArray = new Array(stride * (newHeight + 1));

  // Copy existing data
  for (let i = 0; i < oldArray.length; i++) {
    newArray[i] = oldArray[i];
  }

  // Fill new rows - copy edge values or use default
  for (let z = oldHeight + 1; z <= newHeight; z++) {
    for (let x = 0; x <= oldWidth; x++) {
      const edgeValue = oldArray[oldHeight * stride + x];
      newArray[z * stride + x] = edgeValue; // or defaultHeight
    }
  }
  return newArray;
}
```

#### Adding Rows/Columns at Start (Prepend)

This requires re-indexing the entire array:

```typescript
function prependYCrdRows(
  oldArray: number[],
  oldWidth: number,
  oldHeight: number,
  prependRows: number,
  defaultHeight: number
): number[] {
  const newHeight = oldHeight + prependRows;
  const stride = oldWidth + 1;
  const newArray = new Array(stride * (newHeight + 1));

  // Fill prepended rows
  for (let z = 0; z < prependRows; z++) {
    for (let x = 0; x <= oldWidth; x++) {
      const edgeValue = oldArray[x]; // First row values
      newArray[z * stride + x] = edgeValue;
    }
  }

  // Copy existing data with offset
  for (let z = 0; z <= oldHeight; z++) {
    for (let x = 0; x <= oldWidth; x++) {
      newArray[(z + prependRows) * stride + x] = oldArray[z * stride + x];
    }
  }
  return newArray;
}
```

### Roof Data (YCrd 1001)

Bugdom 1 has a second heightmap for ceilings. The same resize logic applies.

---

## Game-Specific Considerations

### Otto Matic / Cro-Mag Rally / Bugdom 2 / Nanosaur 2 / Billy Frontier

**Standard Resource Fork Format**

Updates required:
1. Header: mapWidth, mapHeight
2. YCrd[1000]: Resize heightmap array
3. Atrb[1000]: Resize tile attributes
4. STgd[1000]: Resize supertile grid
5. Validate/adjust items if shrinking

### Bugdom 1

**Resource Fork with Roof and Layr**

Additional updates:
1. YCrd[1001]: Resize roof heightmap (if present)
2. Layr[1000]: Resize tile layer array
3. Vcol: May need resizing (vertex colors)
4. **Constraint:** TILES_PER_SUPERTILE = 5

### Nanosaur 1

**Proprietary Binary Format (.ter)**

**Header fields:**
```typescript
interface NanosaurHeader {
  textureLayerOffset: number;
  heightmapLayerOffset: number;
  pathLayerOffset: number;
  objectListOffset: number;
  heightmapTilesOffset: number;
  width: number;   // <-- mapWidth equivalent
  depth: number;   // <-- mapHeight equivalent
  textureAttribOffset: number;
  tileAnimDataOffset: number;
}
```

**Arrays to resize:**
- `textureLayer`: Uint16[], size = width × depth
- `heightmapLayer`: Uint16[], size = width × depth (optional)
- `pathLayer`: Uint16[], size = width × depth (optional)
- `textureAttribs`: Array of attribute objects

**Key file:** `src/editor/loadLogic/compileNanosaur1Level.ts`

**Important:** All offsets must be recalculated after resizing.

### Mighty Mike

**2D Tilemap Format**

**Completely different structure:**
```typescript
interface MightyMikeMap {
  mapWidth: number;
  mapHeight: number;
  numItems: number;
  mapImage: MightyMikeTileValue[][]; // 2D array, not 1D!
  items: MightyMikeItem[];
  altMap: number[][] | null;
}
```

**Updates required:**
1. mapWidth, mapHeight
2. mapImage: 2D array resize (add rows/columns)
3. altMap: Same resize if present
4. items: Validate positions

**No heightmap data** - this is a 2D game.

---

## Implementation Strategy

### Phase 1: Core Resize Functions

Create a new file: `src/data/utils/levelResizeUtils.ts`

```typescript
interface ResizeOptions {
  // Where to add new space
  direction: 'top' | 'bottom' | 'left' | 'right';
  // How many supertiles to add (will be multiplied by TILES_PER_SUPERTILE)
  supertileCount: number;
  // Default values for new areas
  defaultHeight: number;
  defaultTileAttribute: TileAttribute;
  defaultSupertileId: number; // -1 or empty
}

interface ResizeResult {
  success: boolean;
  newLevelData: LevelData;
  warnings: string[];
  itemsOutOfBounds: TerrainItem[];
}

function resizeLevel(
  levelData: LevelData,
  globals: GlobalsInterface,
  options: ResizeOptions
): ResizeResult;
```

### Phase 2: Array Resize Helpers

```typescript
// Generic 1D-as-2D array resize
function resize1DArray<T>(
  array: T[],
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
  offsetX: number,  // For prepending columns
  offsetZ: number,  // For prepending rows
  defaultValue: T | ((x: number, z: number) => T)
): T[];

// YCrd-specific (has +1 dimensions)
function resizeYCrdArray(
  array: number[],
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
  offsetX: number,
  offsetZ: number,
  defaultHeight: number
): number[];
```

### Phase 3: Game-Specific Handlers

```typescript
// src/data/utils/levelResizeUtils.ts

function resizeStandardLevel(levelData: LevelData, options: ResizeOptions): ResizeResult;
function resizeBugdom1Level(levelData: LevelData, options: ResizeOptions): ResizeResult;
function resizeNanosaur1Level(levelData: LevelData, rawData: Nanosaur1LevelData, options: ResizeOptions): ResizeResult;
function resizeMightyMikeLevel(map: MightyMikeMap, options: ResizeOptions): ResizeResult;

// Dispatcher
function resizeLevel(
  levelData: LevelData,
  globals: GlobalsInterface,
  options: ResizeOptions
): ResizeResult {
  switch (globals.GAME_TYPE) {
    case Game.BUGDOM:
      return resizeBugdom1Level(levelData, options);
    case Game.NANOSAUR:
      return resizeNanosaur1Level(levelData, /* raw data */, options);
    case Game.MIGHTY_MIKE:
      return resizeMightyMikeLevel(/* map data */, options);
    default:
      return resizeStandardLevel(levelData, options);
  }
}
```

### Phase 4: Item Position Adjustment

When expanding, items stay in place. When shrinking or prepending:

```typescript
function adjustItemPositions(
  items: TerrainItem[],
  offsetX: number,  // Game units to add to x
  offsetZ: number,  // Game units to add to z
  maxX: number,     // New boundary
  maxZ: number,     // New boundary
  globals: GlobalsInterface
): { adjusted: TerrainItem[], outOfBounds: TerrainItem[] };
```

### Phase 5: Header Update

```typescript
function updateHeaderForResize(
  header: StandardHeader,
  newWidth: number,
  newHeight: number,
  globals: GlobalsInterface
): StandardHeader {
  const updated = { ...header };
  updated.mapWidth = newWidth;
  updated.mapHeight = newHeight;

  // Recalculate derived fields if present
  if ('numTiles' in updated) {
    updated.numTiles = newWidth * newHeight;
  }

  return updated;
}
```

---

## Validation Requirements

### Pre-Resize Validation

```typescript
function validateResizeRequest(
  levelData: LevelData,
  globals: GlobalsInterface,
  options: ResizeOptions
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const header = levelData.Hedr[1000].obj;
  const addTiles = options.supertileCount * globals.TILES_PER_SUPERTILE;

  // Calculate new dimensions
  const newWidth = options.direction === 'left' || options.direction === 'right'
    ? header.mapWidth + addTiles
    : header.mapWidth;
  const newHeight = options.direction === 'top' || options.direction === 'bottom'
    ? header.mapHeight + addTiles
    : header.mapHeight;

  // Check divisibility
  if (newWidth % globals.TILES_PER_SUPERTILE !== 0) {
    errors.push(`New width (${newWidth}) must be divisible by ${globals.TILES_PER_SUPERTILE}`);
  }
  if (newHeight % globals.TILES_PER_SUPERTILE !== 0) {
    errors.push(`New height (${newHeight}) must be divisible by ${globals.TILES_PER_SUPERTILE}`);
  }

  // Check minimum size
  if (newWidth < globals.TILES_PER_SUPERTILE || newHeight < globals.TILES_PER_SUPERTILE) {
    errors.push('Level must have at least one supertile');
  }

  // Check maximum size (game-specific limits may apply)
  const MAX_DIMENSION = 512; // Example limit
  if (newWidth > MAX_DIMENSION || newHeight > MAX_DIMENSION) {
    errors.push(`Level dimensions cannot exceed ${MAX_DIMENSION}`);
  }

  return { valid: errors.length === 0, errors };
}
```

### Post-Resize Validation

```typescript
function validateResizedLevel(
  levelData: LevelData,
  globals: GlobalsInterface
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const header = levelData.Hedr[1000].obj;

  // Check YCrd size
  const expectedYCrdSize = (header.mapWidth + 1) * (header.mapHeight + 1);
  const actualYCrdSize = levelData.YCrd[1000].obj.length;
  if (actualYCrdSize !== expectedYCrdSize) {
    errors.push(`YCrd size mismatch: expected ${expectedYCrdSize}, got ${actualYCrdSize}`);
  }

  // Check Atrb size
  const expectedAtrbSize = header.mapWidth * header.mapHeight;
  const actualAtrbSize = levelData.Atrb[1000].obj.length;
  if (actualAtrbSize !== expectedAtrbSize) {
    errors.push(`Atrb size mismatch: expected ${expectedAtrbSize}, got ${actualAtrbSize}`);
  }

  // Check STgd size (if present)
  if (levelData.STgd?.[1000]?.obj) {
    const expectedStgdSize =
      (header.mapWidth / globals.TILES_PER_SUPERTILE) *
      (header.mapHeight / globals.TILES_PER_SUPERTILE);
    const actualStgdSize = levelData.STgd[1000].obj.length;
    if (actualStgdSize !== expectedStgdSize) {
      errors.push(`STgd size mismatch: expected ${expectedStgdSize}, got ${actualStgdSize}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

---

## UI Considerations

### Resize Dialog

Suggested UI elements:
1. Direction selector (Top/Bottom/Left/Right)
2. Supertile count input (1-10 range)
3. Preview showing new dimensions
4. Default height value input
5. "Fill from edge" vs "Fill with default" toggle
6. Warning display for items that will be out of bounds

### Integration Points

- **Header info panel** - Display current dimensions, allow resize trigger
- **Supertiles view** - Visual representation of resize operation
- **Items panel** - Warning for out-of-bounds items

### Undo Support

Resize operations should integrate with the existing undo system (if any) or store the previous state for reverting.

---

## File Manifest

### New Files to Create

```
src/data/utils/levelResizeUtils.ts         - Core resize logic
src/data/utils/levelResizeValidation.ts    - Validation functions
src/components/ResizeLevelDialog.tsx       - UI component (optional)
```

### Files to Modify

```
src/data/selectors/headerDataSelectors.ts  - Add resize update functions
src/data/globals/globals.ts               - May need max dimension constants
src/editor/loadLogic/compileNanosaur1Level.ts - Handle resized Nanosaur 1 data
src/modelParsers/parseMightyMike.ts       - Handle resized Mighty Mike maps
```

---

## Summary of Array Size Formulas

| Array | Size Formula | Notes |
|-------|--------------|-------|
| YCrd[1000] | (mapWidth + 1) × (mapHeight + 1) | Extra row/col for edge heights |
| YCrd[1001] | (mapWidth + 1) × (mapHeight + 1) | Roof (Bugdom 1 only) |
| Atrb | mapWidth × mapHeight | One per tile |
| STgd | (mapWidth / TPS) × (mapHeight / TPS) | TPS = TILES_PER_SUPERTILE |
| Layr | mapWidth × mapHeight | Bugdom 1, Nanosaur 1 only |
| Nanosaur textureLayer | width × depth | Proprietary format |
| Nanosaur heightmapLayer | width × depth | Proprietary format |
| Mighty Mike mapImage | [mapHeight][mapWidth] | 2D array |

---

## Risk Assessment

### High Risk
- **Nanosaur 1**: Binary format with complex offset calculations
- **YCrd edge cases**: Off-by-one errors in +1 dimension handling

### Medium Risk
- **Item position adjustment**: Coordinate system differences between games
- **Bugdom 1 roof data**: Keeping floor/roof heights consistent

### Low Risk
- **STgd/Atrb resizing**: Straightforward array expansion
- **Standard format games**: Well-understood structure

---

## Testing Strategy

1. **Unit tests** for each resize helper function
2. **Round-trip tests**: Resize → Save → Load → Verify dimensions
3. **Edge case tests**:
   - Minimum size (1 supertile)
   - Large resizes
   - Prepending vs appending
4. **Game-specific tests**: One test per supported game
5. **Item boundary tests**: Verify item position handling
