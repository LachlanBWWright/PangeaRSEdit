# Bugdom & Nanosaur 1 Terrain System - Complete Technical Documentation

This document describes exactly how Bugdom and Nanosaur 1's terrain tile systems work, based on direct analysis of the source code. Both games use the same tile-based terrain system with minor differences in file format.

## Games Using This System

| Game           | Tile Format       | File Format                 | Has Xlat Table |
| -------------- | ----------------- | --------------------------- | -------------- |
| **Bugdom 1**   | 32×32 px ARGB1555 | `.ter.rsrc` (Resource Fork) | Yes            |
| **Nanosaur 1** | 32×32 px ARGB1555 | `.ter` + `.trt` (Binary)    | No             |

Both games compose **5×5 grids of tiles** into **160×160 pixel supertiles** at runtime.

## ⚠️ IMPORTANT: Known Issues & Fixes

### Issue 1: Sample Data is Invalid

The `Bugdom1SampleData.md` file contains **invalid/test data** that was likely created for testing JSON structure:

- `Layr` contains sequential values 0, 1, 2, 3, ... 25599 (just indices, not real tile data)
- A real level would have tile values that reference valid entries in the Xlat table
- The Xlat table has ~1500 entries, but the test Layr references indices 0-25599
- This causes out-of-bounds access and explains why tiles appear wrong

### Issue 2: Buffer.from() Offset Bug (FIXED)

When loading Timg data, the code was using:

```typescript
const imgBuffer = Buffer.from(imgString, "hex");
new DataView(imgBuffer.buffer); // BUG: doesn't account for byteOffset!
```

`Buffer.from()` may return a view into a larger pooled ArrayBuffer with a non-zero `byteOffset`. This caused tile data to be read from wrong memory positions. Fixed by creating an aligned copy:

```typescript
const alignedBuffer = new ArrayBuffer(imgBuffer.byteLength);
new Uint8Array(alignedBuffer).set(imgBuffer);
new DataView(alignedBuffer);
```

**Real Bugdom level files are available at:**

```
frontend/public/assets/bugdom/terrain/
  - Lawn.ter.rsrc (first level)
  - Training.ter.rsrc
  - AntHill.ter.rsrc
  - Beach.ter.rsrc
  - BeeHive.ter.rsrc
  - Flight.ter.rsrc
  - Night.ter.rsrc
  - Pond.ter.rsrc
  - QueenBee.ter.rsrc
  - AntKing.ter.rsrc
```

The level selector in BugdomLevels.tsx references these via `assets/bugdom/terrain/*.ter`.

---

## Overview

Both Bugdom and Nanosaur 1 use a **tile-based terrain system** where:

1. **Small reusable tiles** (32x32 pixels each, 16-bit color) are stored in a tile bank
2. A **layer map** specifies which tile to use at each position on the terrain
3. **Supertiles** (5x5 tiles = 160x160 pixels) are composed at runtime by copying tiles from the bank

Unlike later Pangea games (Otto Matic, etc.) which store pre-composed supertile textures, these games store individual reusable tiles and reference them.

---

## File Format Differences

### Bugdom 1

- Uses **Resource Fork** format (`.ter.rsrc`)
- Tile images stored in `Timg` resource
- Has `Xlat` translation table to map tile indices to image indices
- Layer data in `Layr` resource contains tile indices that reference Xlat

### Nanosaur 1

- Uses **Binary** format (`.ter` for terrain, `.trt` for tile textures)
- `.trt` file structure:
  - 4 bytes: tile count (big-endian int32)
  - Tile data: `tileCount × 32 × 32 × 2` bytes (ARGB1555, big-endian)
- `.ter` file structure:
  - Header with offsets (40 bytes)
  - Texture layer (tile indices with flip/rotate bits)
  - Heightmap layer
  - Path layer
  - Object list
  - Tile attributes
- **No Xlat table** - tile indices in layer map directly reference image indices

---

## Bugdom Resource Files and Data Structures

### 1. Header (`Hedr` resource, ID 1000)

From `File.c` line 48-61:

```c
typedef struct {
    NumVersion  version;            // version of file
    int32_t     numItems;           // # items in map
    int32_t     mapWidth;           // width of map (in tiles)
    int32_t     mapHeight;          // height of map (in tiles)
    int32_t     numTilePages;       // # tile pages (not used at runtime)
    int32_t     numTilesInList;     // # extracted tiles in tile bank
    float       tileSize;           // 3D unit size of a tile
    float       minY, maxY;         // min/max height values
    int32_t     numSplines;         // # splines
    int32_t     numFences;          // # fences
} PlayfieldHeaderType;
```

**Key values:**

- `mapWidth` / `mapHeight`: Size of terrain in tiles (e.g., 176 x 176 tiles)
- `numTilesInList`: Number of 32x32 tile images in the tile bank (e.g., 143 tiles)

---

### 2. Tile Image Bank (`Timg` resource, ID 1000)

From `File.c` line 842-848:

```c
hand = GetResource('Timg', 1000);
GAME_ASSERT(hand);
{
    DetachResource(hand);
    UNPACK_BE_SCALARS_AUTOSIZEHANDLE(u_short, hand);
    gTileDataHandle = (u_short **)hand;
}
```

**Format:**

- Raw binary data containing ALL tile images concatenated together
- Each tile is 32 x 32 pixels = 1024 pixels
- Each pixel is 16 bits (u_short) = 2048 bytes per tile
- Total size = `numTilesInList` × 32 × 32 × 2 bytes
- Pixel format: **16-bit ARGB1555** (1 bit alpha, 5 bits each RGB)

**Example:** If `numTilesInList = 143`, then:

- Tile 0 starts at byte offset 0
- Tile 1 starts at byte offset 2048
- Tile N starts at byte offset N × 2048

---

### 3. Tile Translation Table (`Xlat` resource, ID 1000)

From `File.c` line 853-861:

```c
hand = GetResource('Xlat', 1000);
{
    GAME_ASSERT(hand);
    DetachResource(hand);
    HLockHi(hand);
    UNPACK_BE_SCALARS_AUTOSIZEHANDLE(short, hand);
    xlateTableHand = (short **)hand;
    xlateTbl = *xlateTableHand;
}
```

**Purpose:** Maps tile indices from the Layr resource to actual image indices in Timg.

**Format:**

- Array of signed 16-bit integers (shorts)
- `xlateTbl[tile_index]` returns the image index in the tile bank

**Why it exists:** The level editor may use tile indices that don't correspond directly to image storage order. The Xlat table allows the level designer to reference tiles by a logical index while the actual images can be stored efficiently.

---

### 4. Layer Map (`Layr` resource, ID 1000 for floor, 1001 for ceiling)

From `File.c` line 873-889:

```c
hand = GetResource('Layr', 1000);  // floor layer
// ...
u_short *src = (u_short*)*hand;
for (row = 0; row < gTerrainTileDepth; row++)
    for (col = 0; col < gTerrainTileWidth; col++)
    {
        u_short tile, imageNum;

        tile = *src++;                                    // get original tile with all bits
        imageNum = xlateTbl[tile & TILENUM_MASK];         // get image # from xlate table
        gFloorMap[row][col] = (tile & (~TILENUM_MASK)) | imageNum;  // combine
    }
```

**Format:**

- 2D array of unsigned 16-bit integers (u_short)
- Size: `mapHeight` × `mapWidth` entries
- Stored in row-major order: `Layr[row * mapWidth + col]`

**Each 16-bit tile value contains:**

From `terrain.h` lines 114-121:

```c
#define TILENUM_MASK      0x0fff   // bits 0-11: tile index (0-4095)
#define TILE_FLIPX_MASK   (1<<15)  // bit 15: flip horizontally
#define TILE_FLIPY_MASK   (1<<14)  // bit 14: flip vertically
#define TILE_FLIPXY_MASK  (TILE_FLIPY_MASK | TILE_FLIPX_MASK)
#define TILE_ROTATE_MASK  ((1<<13)|(1<<12))  // bits 12-13: rotation
#define TILE_ROT1         (1<<12)   // 90° CW rotation
#define TILE_ROT2         (2<<12)   // 180° rotation
#define TILE_ROT3         (3<<12)   // 270° CW rotation
```

**Bit layout:**

```
Bit:  15  14  13  12  11  10   9   8   7   6   5   4   3   2   1   0
      FX  FY  R1  R0  |<------------- tile index (0-4095) ----------->|
```

**CRITICAL:** The Xlat translation is applied during loading! After `ReadDataFromPlayfieldFile()`:

- `gFloorMap[row][col]` contains the **translated image index** (not the original tile index)
- The flip/rotate bits are preserved in the upper bits

---

### 5. Supertile Constants

From `terrain.h` lines 57-68:

```c
#define OREOMAP_TILE_SIZE           32    // pixel width/height of one tile
#define SUPERTILE_SIZE              5     // tiles per supertile (5x5 = 25 tiles)
#define SUPERTILE_TEXSIZE_LOSSLESS  (OREOMAP_TILE_SIZE * SUPERTILE_SIZE)  // 160x160
#define SUPERTILE_TEXSIZE_SEAMLESS  (OREOMAP_TILE_SIZE * (SUPERTILE_SIZE + 2))  // 224x224
```

**Key dimensions:**

- Tile size: 32 × 32 pixels
- Supertile: 5 × 5 tiles = 160 × 160 pixels
- Number of supertiles wide: `ceil(mapWidth / 5)`
- Number of supertiles deep: `ceil(mapHeight / 5)`

---

## Runtime Supertile Construction

### BuildTerrainSuperTile() - How supertiles are composed

From `Terrain.c` lines 929-965:

```c
int textureMinRow = 0;
int textureMinCol = 0;
int textureMaxRow = textureMinRow + SUPERTILE_SIZE;  // 5
int textureMaxCol = textureMinCol + SUPERTILE_SIZE;  // 5

for (row2 = textureMinRow; row2 < textureMaxRow; row2++)
{
    row = row2 + startRow;  // map row

    for (col2 = textureMinCol; col2 < textureMaxRow; col2++)
    {
        col = col2 + startCol;  // map col

        if (row < 0 || row >= gTerrainTileDepth ||
            col < 0 || col >= gTerrainTileWidth)
        {
            tile = 0;  // out of bounds = black/tile 0
        }
        else if (layer == 0)
        {
            tile = gFloorMap[row][col];  // get tile from floor map
        }
        else
        {
            tile = gCeilingMap[row][col];  // ceiling layer
        }

        DrawTileIntoMipmap(tile, row2, col2, gTempTextureBuffer);
    }
}
```

**Process:**

1. For each supertile position `(startCol, startRow)` on the map
2. Loop through 5×5 tile positions within the supertile
3. Get the tile value from `gFloorMap[row][col]`
4. Draw that tile into the supertile texture buffer at position `(col2, row2)`

---

### DrawTileIntoMipmap() - How individual tiles are copied

From `Terrain.c` lines 1087-1120:

```c
static void DrawTileIntoMipmap(uint16_t tile, int row, int col, uint16_t *buffer)
{
    uint16_t texMapNum;
    uint16_t flipRotBits;
    const uint16_t* tileData;

    const int tileSize = OREOMAP_TILE_SIZE;  // 32
    const int bufWidth = SUPERTILE_TEXSIZE_LOSSLESS;  // 160

    // Extract flip/rotate bits and tile number
    flipRotBits = tile & (TILE_FLIPXY_MASK | TILE_ROTATE_MASK);
    texMapNum = tile & TILENUM_MASK;  // Get image index (already translated!)

    if (texMapNum >= gNumTerrainTextureTiles)
    {
        texMapNum = 0;  // Invalid tile -> use tile 0
    }

    // Calculate destination position in output buffer
    const int startX = col * tileSize;  // e.g., col=2 -> startX=64
    const int startY = row * tileSize;  // e.g., row=3 -> startY=96

    buffer += (startY * bufWidth) + startX;  // Move to start position

    // Get source tile data from tile bank
    tileData = (*gTileDataHandle) + (texMapNum * tileSize * tileSize);

    // Copy tile with flip/rotate transformations...
    switch(flipRotBits) { /* 16 cases for all flip/rotate combinations */ }
}
```

**Key insight:** `texMapNum` is the **image index** (already translated via Xlat), not the original tile index!

---

## Summary of Data Flow

```
[At Load Time]
1. Load Timg → gTileDataHandle (array of numTilesInList tiles, each 32×32×2 bytes)
2. Load Xlat → xlateTbl (translation table: tile_index → image_index)
3. Load Layr → for each tile position:
   - Read tile value from file
   - Extract tile_index = value & 0x0FFF
   - Look up image_index = xlateTbl[tile_index]
   - Store in gFloorMap: (value & 0xF000) | image_index

[At Runtime - when building supertile at (startCol, startRow)]
4. For row2 = 0 to 4, col2 = 0 to 4:
   - mapRow = startRow + row2
   - mapCol = startCol + col2
   - tile = gFloorMap[mapRow][mapCol]  // Already has image_index!
   - texMapNum = tile & 0x0FFF  // This IS the image index
   - flipRotBits = tile & 0xF000
   - Copy tile from gTileDataHandle[texMapNum * 1024] into supertile texture
```

---

## For the Editor Implementation

### What needs to happen:

1. **Load Timg**: Parse as array of 32×32 tile images (each 2048 bytes, 16-bit ARGB1555)

   - Total tiles = Timg size / (32 × 32 × 2)
   - Or use `numTilesInList` from header

2. **Load Xlat**: Parse as array of signed 16-bit integers
3. **Load Layr**: Parse as 2D array (row-major) of unsigned 16-bit integers

   - Apply Xlat translation during load (or at render time)
   - Preserve flip/rotate bits

4. **Render supertiles**: For each supertile position:
   - Get 5×5 tiles from Layr
   - For each tile: extract image_index, flip, rotate
   - Copy tile from Timg into supertile canvas with transformations

### Critical checks:

- If `tile & TILENUM_MASK >= numTilesInList`, use tile 0 (or render black)
- Ensure Xlat translation produces valid image indices
- The flip/rotate bits affect how the tile is drawn, not which tile is selected

---

## Pixel Format

The tiles use **16-bit ARGB1555** format:

```
Bit:  15   14-10   9-5    4-0
      A    Red     Green  Blue
```

To convert to RGBA8888:

```javascript
const a = pixel >> 15 ? 255 : 0; // or always 255
const r = ((pixel >> 10) & 0x1f) << 3;
const g = ((pixel >> 5) & 0x1f) << 3;
const b = (pixel & 0x1f) << 3;
```

---

## Additional Resources

### YCrd (Height Data)

- Resource ID 1000 (floor), 1001 (ceiling)
- Array of floats, size = (mapHeight+1) × (mapWidth+1)
- Height values for each vertex (corner of tiles)

### Vcol (Vertex Colors)

- Resource ID 1000 (floor), 1001 (ceiling)
- Array of u_short, size = (mapHeight+1) × (mapWidth+1)
- Per-vertex color tinting

### Splt (Split Mode)

- Resource ID 1000 (floor), 1001 (ceiling)
- Array of bytes, size = mapHeight × mapWidth
- Controls how each tile is split into triangles for 3D rendering

### Atrb (Tile Attributes)

- Flags and parameters for each tile type
- Used for gameplay logic (water, solid, etc.)
