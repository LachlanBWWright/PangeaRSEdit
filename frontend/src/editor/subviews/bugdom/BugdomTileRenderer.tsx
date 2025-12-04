/**
 * BugdomTileRenderer.tsx
 *
 * Bugdom 1 uses a different tile texture system than other Pangea games.
 * Instead of pre-composed supertile textures, Bugdom 1 uses:
 * - Individual 32x32 pixel tiles stored in 'Timg' resource
 * - 'Xlat' translation table to map tile indices to image indices
 * - 'Layr' contains tile indices with flip/rotate bits
 * - Supertiles are constructed from a 5x5 grid of tiles at runtime
 *
 * This component renders the composed supertile textures for Bugdom 1 levels.
 */

import { Layer, Image, Rect } from "react-konva";
import { Fragment, memo, useMemo } from "react";
import { SelectedTile } from "@/data/supertiles/supertileAtoms";
import { useAtom, useAtomValue } from "jotai";
import { Globals, Game } from "@/data/globals/globals";
import {
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/ottoMaticLevelData";

// Tile bit masks from Bugdom source code (terrain.h)
export const TILENUM_MASK = 0x0fff; // bits 0-11: tile/image number
export const TILE_FLIPX_MASK = 1 << 15; // bit 15: flip horizontally
export const TILE_FLIPY_MASK = 1 << 14; // bit 14: flip vertically
export const TILE_FLIPXY_MASK = TILE_FLIPY_MASK | TILE_FLIPX_MASK;
export const TILE_ROTATE_MASK = (1 << 13) | (1 << 12); // bits 12-13: rotation
export const TILE_ROT1 = 1 << 12; // 90° rotation
export const TILE_ROT2 = 2 << 12; // 180° rotation
export const TILE_ROT3 = 3 << 12; // 270° rotation

export interface BugdomLevelData {
  Xlat?: {
    1000: {
      obj: Array<{ idx: number }>;
      order: number;
    };
  };
  Timg?: {
    1000: {
      data: string;
      order: number;
    };
  };
  Layr: {
    1000: {
      obj: number[];
      order: number;
    };
  };
}

/**
 * Draw a single tile into a buffer with flip/rotate transformations
 * This replicates the DrawTileIntoMipmap function from Bugdom's Terrain.c
 */
export function drawTileIntoBuffer(
  tileValue: number,
  tileImages: HTMLCanvasElement[],
  destCtx: CanvasRenderingContext2D,
  destX: number,
  destY: number,
  tileSize: number = 32,
  debugLog: boolean = false,
): void {
  const flipRotBits = tileValue & (TILE_FLIPXY_MASK | TILE_ROTATE_MASK);
  const texMapNum = tileValue & TILENUM_MASK;

  if (texMapNum >= tileImages.length) {
    // Invalid tile index - fill with magenta for visibility
    if (debugLog) {
      console.warn(
        `drawTileIntoBuffer: texMapNum ${texMapNum} >= tileImages.length ${tileImages.length}`,
      );
    }
    destCtx.fillStyle = "magenta";
    destCtx.fillRect(destX, destY, tileSize, tileSize);
    return;
  }

  if (!tileImages[texMapNum]) {
    // Tile canvas is null/undefined - fill with cyan for visibility
    if (debugLog) {
      console.warn(
        `drawTileIntoBuffer: tileImages[${texMapNum}] is null/undefined`,
      );
    }
    destCtx.fillStyle = "cyan";
    destCtx.fillRect(destX, destY, tileSize, tileSize);
    return;
  }

  const tileCanvas = tileImages[texMapNum];

  // Save context state before transformations
  destCtx.save();

  // Move to the center of where the tile will be drawn
  destCtx.translate(destX + tileSize / 2, destY + tileSize / 2);

  // Apply transformations based on flip/rot bits
  // Handle all 16 combinations of flip and rotation
  // Order: rotate first, then scale (to match Konva's transformation order in BugdomTileMenu)
  const flipX = (flipRotBits & TILE_FLIPX_MASK) !== 0;
  const flipY = (flipRotBits & TILE_FLIPY_MASK) !== 0;
  const rotation = flipRotBits & TILE_ROTATE_MASK;

  // Apply rotation first (rotation bits 12-13 encode 0, 90, 180, 270 degrees)
  switch (rotation) {
    case TILE_ROT1:
      destCtx.rotate(Math.PI / 2); // 90 degrees
      break;
    case TILE_ROT2:
      destCtx.rotate(Math.PI); // 180 degrees
      break;
    case TILE_ROT3:
      destCtx.rotate((3 * Math.PI) / 2); // 270 degrees
      break;
    default:
      // No rotation
      break;
  }

  // Apply flips after rotation
  const scaleX = flipX ? -1 : 1;
  const scaleY = flipY ? -1 : 1;
  destCtx.scale(scaleX, scaleY);

  // Draw tile centered at origin (which is now at destX+16, destY+16)
  destCtx.drawImage(
    tileCanvas,
    -tileSize / 2,
    -tileSize / 2,
    tileSize,
    tileSize,
  );

  // Restore context state
  destCtx.restore();
}

/**
 * Apply the Xlat translation table to convert tile indices to image indices
 * This is how Bugdom 1 maps tile IDs in Layr to actual texture images
 *
 * In the original C code:
 *   imageNum = xlateTbl[tile & TILENUM_MASK];
 *   gFloorMap[row][col] = (tile & ~TILENUM_MASK) | imageNum;
 *
 * The Xlat table maps tile indices to image indices.
 * Note: Xlat is signed short in C, so values could potentially be negative.
 */
export function translateTileIndex(
  tileValue: number,
  xlatTable: Array<{ idx: number }> | undefined,
  numTileImages: number,
  logWarnings: boolean = false,
): number {
  if (!xlatTable) return tileValue;

  const tileIndex = tileValue & TILENUM_MASK;
  const otherBits = tileValue & ~TILENUM_MASK;

  if (tileIndex >= xlatTable.length) {
    if (logWarnings) {
      console.warn(
        `translateTileIndex: tile index ${tileIndex} exceeds Xlat table size ${xlatTable.length}`,
      );
    }
    return otherBits; // Return with image index 0
  }

  // Get the translated image index from Xlat
  const xlatEntry = xlatTable[tileIndex];
  if (!xlatEntry) {
    return otherBits; // Return with image index 0
  }
  const translatedIndex = xlatEntry.idx;

  // Validate the translated index
  if (translatedIndex < 0 || translatedIndex >= numTileImages) {
    if (logWarnings) {
      console.warn(
        `translateTileIndex: Xlat[${tileIndex}] = ${translatedIndex} is out of range [0, ${numTileImages})`,
      );
    }
    return otherBits; // Return with image index 0
  }

  return otherBits | (translatedIndex & TILENUM_MASK);
}

/**
 * Build a supertile image from individual tiles
 * Bugdom 1 uses 5x5 tiles per supertile, each tile is 32x32 pixels
 * Result is a 160x160 pixel supertile texture
 */
export function buildSupertileFromTiles(
  startRow: number,
  startCol: number,
  mapWidth: number,
  mapHeight: number,
  layerData: number[],
  xlatTable: Array<{ idx: number }> | undefined,
  tileImages: HTMLCanvasElement[],
  tilesPerSupertile: number = 5,
  tileSize: number = 32,
  debugFirstSupertile: boolean = false,
): HTMLCanvasElement {
  const supertilePixelSize = tilesPerSupertile * tileSize;
  const canvas = document.createElement("canvas");
  canvas.width = supertilePixelSize;
  canvas.height = supertilePixelSize;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    console.error("Could not get canvas context for supertile");
    return canvas;
  }

  // Fill with a visible background (magenta for debugging)
  ctx.fillStyle = debugFirstSupertile ? "magenta" : "black";
  ctx.fillRect(0, 0, supertilePixelSize, supertilePixelSize);

  let tilesDrawn = 0;

  // Draw each tile in the 5x5 grid
  for (let tileRow = 0; tileRow < tilesPerSupertile; tileRow++) {
    for (let tileCol = 0; tileCol < tilesPerSupertile; tileCol++) {
      const mapRow = startRow + tileRow;
      const mapCol = startCol + tileCol;

      // Check bounds
      if (mapRow >= mapHeight || mapCol >= mapWidth) {
        continue;
      }

      const flatIndex = mapRow * mapWidth + mapCol;
      if (flatIndex >= layerData.length) {
        continue;
      }

      const tileValue = layerData[flatIndex];
      if (tileValue === undefined) {
        continue;
      }

      // Apply Xlat translation if available
      const translatedTile = translateTileIndex(
        tileValue,
        xlatTable,
        tileImages.length,
        debugFirstSupertile && tilesDrawn < 5,
      );

      // Draw the tile with transformations
      const destX = tileCol * tileSize;
      const destY = tileRow * tileSize;

      if (debugFirstSupertile && tilesDrawn < 3) {
        console.log("buildSupertileFromTiles: Drawing tile", {
          tileRow,
          tileCol,
          mapRow,
          mapCol,
          flatIndex,
          tileValue,
          translatedTile,
          tileNum: translatedTile & TILENUM_MASK,
          hasTileImage: !!tileImages[translatedTile & TILENUM_MASK],
          tileImagesLength: tileImages.length,
        });
      }

      drawTileIntoBuffer(
        translatedTile,
        tileImages,
        ctx,
        destX,
        destY,
        tileSize,
        debugFirstSupertile && tilesDrawn < 10,
      );
      tilesDrawn++;
    }
  }

  if (debugFirstSupertile) {
    console.log("buildSupertileFromTiles: Drew", tilesDrawn, "tiles");
    // Also log the first tile canvas if available
    if (tileImages.length > 0 && tileImages[0]) {
      console.log(
        "First tile image size:",
        tileImages[0].width,
        "x",
        tileImages[0].height,
      );
      console.log(
        "First tile image data URL:",
        tileImages[0].toDataURL("image/png").substring(0, 100),
        "...",
      );

      // Sample a few pixels from the first tile to check if it's blank
      const firstTileCtx = tileImages[0].getContext("2d");
      if (firstTileCtx) {
        const imgData = firstTileCtx.getImageData(0, 0, 8, 1);
        const firstPixels = [];
        for (let i = 0; i < 8; i++) {
          firstPixels.push({
            r: imgData.data[i * 4],
            g: imgData.data[i * 4 + 1],
            b: imgData.data[i * 4 + 2],
            a: imgData.data[i * 4 + 3],
          });
        }
        console.log("First tile, first 8 pixels:", firstPixels);
      }
    }

    // Sample a few different tiles to check for blank/white tiles
    const tileSamplesToCheck = [0, 1, 5, 10, 50, 100];
    for (const idx of tileSamplesToCheck) {
      if (idx < tileImages.length && tileImages[idx]) {
        const ctx = tileImages[idx].getContext("2d");
        if (ctx) {
          const imgData = ctx.getImageData(0, 0, 4, 1);
          const isWhite = imgData.data.every((v, i) => i % 4 === 3 || v > 240);
          const isBlack = imgData.data.every((v, i) => i % 4 === 3 || v < 15);
          if (isWhite || isBlack) {
            console.warn(
              `Tile ${idx} appears to be ${isWhite ? "WHITE" : "BLACK"}:`,
              Array.from(imgData.data.slice(0, 16)),
            );
          }
        }
      }
    }
  }

  return canvas;
}

/**
 * Build all supertile images for a Bugdom 1 level
 */
export function buildAllBugdomSupertiles(
  headerData: HeaderData,
  layerData: number[],
  xlatTable: Array<{ idx: number }> | undefined,
  tileImages: HTMLCanvasElement[],
  tilesPerSupertile: number = 5,
  tileSize: number = 32,
): HTMLCanvasElement[] {
  const header = headerData.Hedr[1000].obj;
  const mapWidth = header.mapWidth;
  const mapHeight = header.mapHeight;

  const supertilesWide = Math.ceil(mapWidth / tilesPerSupertile);
  const supertilesDeep = Math.ceil(mapHeight / tilesPerSupertile);

  const supertileImages: HTMLCanvasElement[] = [];

  for (let stRow = 0; stRow < supertilesDeep; stRow++) {
    for (let stCol = 0; stCol < supertilesWide; stCol++) {
      const startRow = stRow * tilesPerSupertile;
      const startCol = stCol * tilesPerSupertile;
      const isFirstSupertile = stRow === 0 && stCol === 0;

      const supertile = buildSupertileFromTiles(
        startRow,
        startCol,
        mapWidth,
        mapHeight,
        layerData,
        xlatTable,
        tileImages,
        tilesPerSupertile,
        tileSize,
        isFirstSupertile, // Debug first supertile
      );

      supertileImages.push(supertile);
    }
  }

  return supertileImages;
}

/**
 * Main Bugdom tiles component for rendering in Konva
 */
export const BugdomSupertiles = memo(
  ({
    headerData,
    terrainData,
    tileImages,
    xlatTable,
  }: {
    headerData: HeaderData;
    terrainData: TerrainData;
    tileImages: HTMLCanvasElement[];
    xlatTable?: Array<{ idx: number }>;
  }) => {
    const globals = useAtomValue(Globals);
    const [selectedTile, setSelectedTile] = useAtom(SelectedTile);
    const header = headerData.Hedr[1000].obj;

    const tilesPerSupertile = globals.TILES_PER_SUPERTILE; // 5 for Bugdom
    const tileSize = globals.TILE_SIZE; // 32 for Bugdom
    const supertilePixelSize = globals.SUPERTILE_TEXMAP_SIZE; // 160 for Bugdom (5 * 32)

    const supertilesWide = Math.ceil(header.mapWidth / tilesPerSupertile);

    // Build all supertile images from individual tiles
    const supertileImages = useMemo(() => {
      if (!terrainData.Layr?.[1000]?.obj || tileImages.length === 0) {
        console.log("BugdomTileRenderer: No Layr data or tileImages", {
          hasLayr: !!terrainData.Layr?.[1000]?.obj,
          tileImagesLength: tileImages.length,
        });
        return [];
      }

      const layerData = terrainData.Layr[1000].obj;

      // Detect invalid/test data by checking if Layr values are sequential
      // Real Bugdom data has tile indices (typically < numTiles) with flip/rotate bits
      // Invalid test data often has sequential values 0, 1, 2, 3...
      const isLikelyInvalidData =
        layerData.length > 100 &&
        layerData[0] === 0 &&
        layerData[1] === 1 &&
        layerData[2] === 2 &&
        layerData[3] === 3;

      if (isLikelyInvalidData) {
        console.error(
          "BugdomTileRenderer: WARNING - Layr data appears to be invalid test data (sequential values 0,1,2,3...).\n" +
            "This is NOT a real Bugdom level file.\n" +
            "Real level files are available at: frontend/public/assets/bugdom/terrain/*.ter.rsrc",
        );
      }

      // Check if Xlat table is too small for the tile indices in Layr
      const maxTileIndex = Math.max(
        ...layerData.slice(0, 100).map((v) => v & TILENUM_MASK),
      );
      if (xlatTable && maxTileIndex >= xlatTable.length) {
        console.warn(
          `BugdomTileRenderer: Layr contains tile indices (max: ${maxTileIndex}) larger than Xlat table (${xlatTable.length} entries).\n` +
            "This may cause tiles to render incorrectly.",
        );
      }

      const firstTileValues = layerData.slice(0, 25).map((v, i) => ({
        index: i,
        raw: v,
        tileNum: v & TILENUM_MASK,
        translated: xlatTable
          ? xlatTable[v & TILENUM_MASK]?.idx
          : v & TILENUM_MASK,
        flipX: (v & TILE_FLIPX_MASK) !== 0,
        flipY: (v & TILE_FLIPY_MASK) !== 0,
        rotation: (v & TILE_ROTATE_MASK) >> 12,
      }));

      // Log first 20 Xlat values to see what the translation table contains
      const firstXlatValues = xlatTable
        ?.slice(0, 20)
        .map((x, i) => ({ index: i, imageIdx: x.idx }));

      // Analyze Xlat table for potential issues
      const xlatAnalysis = xlatTable
        ? (() => {
            let negativeCount = 0;
            let outOfBoundsCount = 0;
            let maxIdx = 0;
            let minIdx = Infinity;

            for (let i = 0; i < xlatTable.length; i++) {
              const entry = xlatTable[i];
              if (!entry) continue;
              const idx = entry.idx;
              if (idx < 0) negativeCount++;
              if (idx >= tileImages.length) outOfBoundsCount++;
              maxIdx = Math.max(maxIdx, idx);
              minIdx = Math.min(minIdx, idx);
            }

            return {
              negativeCount,
              outOfBoundsCount,
              maxIdx,
              minIdx,
              numTileImages: tileImages.length,
            };
          })()
        : null;

      // Analyze Layr for potential issues
      const layrAnalysis = (() => {
        let maxTileIdx = 0;
        let tilesWithFlipBits = 0;
        let tilesWithRotation = 0;

        for (let i = 0; i < Math.min(1000, layerData.length); i++) {
          const val = layerData[i];
          if (val === undefined) continue;
          const tileIdx = val & TILENUM_MASK;
          maxTileIdx = Math.max(maxTileIdx, tileIdx);
          if (val & TILE_FLIPXY_MASK) tilesWithFlipBits++;
          if (val & TILE_ROTATE_MASK) tilesWithRotation++;
        }

        return {
          maxTileIdx,
          tilesWithFlipBits,
          tilesWithRotation,
          xlatTableLength: xlatTable?.length ?? 0,
          tileIdxExceedsXlat: maxTileIdx >= (xlatTable?.length ?? 0),
        };
      })();

      // Check for sparse white tiles pattern - sample every 160th tile (one per row) for first 20 rows
      const rowSamples = [];
      for (let row = 0; row < 20 && row < header.mapHeight; row++) {
        const startIdx = row * header.mapWidth;
        const tileValue = layerData[startIdx];
        if (tileValue === undefined) continue;
        const tileIdx = tileValue & TILENUM_MASK;
        const xlatEntry = xlatTable && tileIdx < xlatTable.length ? xlatTable[tileIdx] : undefined;
        const translatedIdx = xlatEntry ? xlatEntry.idx : tileIdx;
        rowSamples.push({
          row,
          flatIndex: startIdx,
          tileValue,
          tileIdx,
          translatedIdx,
          hasTileImage: translatedIdx >= 0 && translatedIdx < tileImages.length,
        });
      }

      console.log("BugdomTileRenderer: Building supertiles", {
        mapWidth: header.mapWidth,
        mapHeight: header.mapHeight,
        expectedLayrLength: header.mapWidth * header.mapHeight,
        tilesPerSupertile,
        tileSize,
        supertilePixelSize,
        layerDataLength: layerData.length,
        tileImagesCount: tileImages.length,
        numTilesFromHeader: header.numTiles,
        hasXlatTable: !!xlatTable,
        xlatTableLength: xlatTable?.length,
        isLikelyInvalidData,
        firstTileValues,
        firstXlatValues,
        xlatAnalysis,
        layrAnalysis,
        rowSamples,
      });

      // Validate that Layr has correct number of entries
      const expectedLayrLength = header.mapWidth * header.mapHeight;
      if (layerData.length !== expectedLayrLength) {
        console.error(
          `BugdomTileRenderer: Layr length mismatch! ` +
            `Expected ${expectedLayrLength} (${header.mapWidth} x ${header.mapHeight}), ` +
            `got ${layerData.length}. ` +
            `This will cause tiles to be read from wrong positions!`,
        );
      }

      return buildAllBugdomSupertiles(
        headerData,
        terrainData.Layr[1000].obj,
        xlatTable,
        tileImages,
        tilesPerSupertile,
        tileSize,
      );
    }, [
      headerData,
      terrainData.Layr,
      tileImages,
      xlatTable,
      tilesPerSupertile,
      tileSize,
    ]);

    console.log("BugdomTileRenderer: Rendering", {
      supertileImagesCount: supertileImages.length,
      supertilesWide,
    });

    return (
      <Layer>
        {supertileImages.map((img, i) => {
          const isSelected = selectedTile === i;
          const col = i % supertilesWide;
          const row = Math.floor(i / supertilesWide);

          return (
            <Fragment key={i}>
              <Image
                image={img}
                onClick={() => setSelectedTile(i)}
                x={col * supertilePixelSize}
                y={row * supertilePixelSize}
                width={supertilePixelSize}
                height={supertilePixelSize}
              />
              {isSelected && (
                <Rect
                  onClick={() => setSelectedTile(i)}
                  x={col * supertilePixelSize}
                  y={row * supertilePixelSize}
                  width={supertilePixelSize}
                  height={supertilePixelSize}
                  stroke="red"
                  strokeWidth={2}
                />
              )}
            </Fragment>
          );
        })}
      </Layer>
    );
  },
);

/**
 * Check if the current game is Bugdom 1 (uses tile-based supertile construction)
 */
export function isBugdomGame(globals: { GAME_TYPE: Game }): boolean {
  return globals.GAME_TYPE === Game.BUGDOM;
}

/**
 * Check if the current game uses individual tiles to construct supertiles
 * (Bugdom 1 and Nanosaur 1 both use 5x5 grids of 32x32 tiles)
 */
export function usesIndividualTiles(globals: { GAME_TYPE: Game }): boolean {
  return (
    globals.GAME_TYPE === Game.BUGDOM || globals.GAME_TYPE === Game.NANOSAUR
  );
}

export default BugdomSupertiles;
