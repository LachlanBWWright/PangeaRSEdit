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
import { Globals } from "@/data/globals/globals";
import {
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import {
  TILENUM_MASK,
  TILE_FLIPX_MASK,
  TILE_FLIPY_MASK,
  TILE_FLIPXY_MASK,
  TILE_ROTATE_MASK,
  buildAllBugdomSupertiles,
} from "./BugdomTileRenderer.utils";

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
        const xlatEntry =
          xlatTable && tileIdx < xlatTable.length
            ? xlatTable[tileIdx]
            : undefined;
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
      header.mapWidth,
      header.mapHeight,
      header.numTiles,
      supertilePixelSize,
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
// isBugdomGame and usesIndividualTiles moved to utils
