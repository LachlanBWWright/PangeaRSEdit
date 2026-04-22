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
import { Fragment, memo, useEffect, useMemo } from "react";
import { SelectedTile } from "@/data/supertiles/supertileAtoms";
import { useAtom, useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";
import {
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import {
  TILENUM_MASK,
  buildAllBugdomSupertiles,
  buildSupertileFromTiles,
} from "./BugdomTileRenderer.utils";

interface BugdomSupertileCacheEntry {
  readonly layerSnapshot: number[];
  readonly canvases: HTMLCanvasElement[];
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly tilesPerSupertile: number;
  readonly tileSize: number;
  readonly xlatTable: { idx: number }[] | undefined;
  readonly tileImages: HTMLCanvasElement[];
  readonly layerKey: 1000 | 1001;
}

let bugdomSupertileCache: BugdomSupertileCacheEntry | null = null;

function getSupertileIndexForFlatIndex(
  flatIndex: number,
  mapWidth: number,
  tilesPerSupertile: number,
): number {
  const row = Math.floor(flatIndex / mapWidth);
  const col = flatIndex % mapWidth;
  const supertilesWide = Math.ceil(mapWidth / tilesPerSupertile);
  const stRow = Math.floor(row / tilesPerSupertile);
  const stCol = Math.floor(col / tilesPerSupertile);
  return stRow * supertilesWide + stCol;
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
    layerKey = 1000,
  }: {
    headerData: HeaderData;
    terrainData: TerrainData;
    tileImages: HTMLCanvasElement[];
    xlatTable?: { idx: number }[];
    /** Which Layr resource to render: 1000 = floor, 1001 = roof/ceiling */
    layerKey?: 1000 | 1001;
  }) => {
    const globals = useAtomValue(Globals);
    const [selectedTile, setSelectedTile] = useAtom(SelectedTile);
    const header = headerData.Hedr[1000].obj;

    const tilesPerSupertile = globals.TILES_PER_SUPERTILE; // 5 for Bugdom
    const tileSize = globals.TILE_SIZE; // 32 for Bugdom
    const supertilePixelSize = globals.SUPERTILE_TEXMAP_SIZE; // 160 for Bugdom (5 * 32)

    const supertilesWide = Math.ceil(header.mapWidth / tilesPerSupertile);
    const supertilesDeep = Math.ceil(header.mapHeight / tilesPerSupertile);
    // Build all supertile images from individual tiles
    // The cache update logic is intentionally hand-rolled so we can reuse
    // unchanged supertile canvases and redraw only the tiles that changed.
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const { supertileImages, nextCache } = useMemo(() => {
      if (!terrainData.Layr?.[layerKey]?.obj || tileImages.length === 0) {
        return {
          supertileImages: [],
          nextCache: bugdomSupertileCache,
        };
      }

      const layerData = terrainData.Layr[layerKey].obj;

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

      const cache = bugdomSupertileCache;
      const needsFullRebuild =
        cache === null ||
        cache.mapWidth !== header.mapWidth ||
        cache.mapHeight !== header.mapHeight ||
        cache.tilesPerSupertile !== tilesPerSupertile ||
        cache.tileSize !== tileSize ||
        cache.layerKey !== layerKey ||
        cache.tileImages !== tileImages ||
        cache.xlatTable !== xlatTable ||
        cache.layerSnapshot.length !== layerData.length ||
        cache.canvases.length !== supertilesWide * supertilesDeep;

      if (needsFullRebuild) {
        const nextCanvases = buildAllBugdomSupertiles(
          headerData,
          terrainData.Layr[layerKey].obj,
          xlatTable,
          tileImages,
          tilesPerSupertile,
          tileSize,
        );
        const nextCache: BugdomSupertileCacheEntry = {
          layerSnapshot: layerData.slice(),
          canvases: nextCanvases,
          mapWidth: header.mapWidth,
          mapHeight: header.mapHeight,
          tilesPerSupertile,
          tileSize,
          xlatTable,
          tileImages,
          layerKey,
        };
        return { supertileImages: nextCanvases, nextCache };
      }

      const changedSupertiles = new Set<number>();
      for (let i = 0; i < layerData.length; i += 1) {
        if (layerData[i] !== cache.layerSnapshot[i]) {
          changedSupertiles.add(
            getSupertileIndexForFlatIndex(i, header.mapWidth, tilesPerSupertile),
          );
        }
      }

      if (changedSupertiles.size === 0) {
        return { supertileImages: cache.canvases, nextCache: cache };
      }

      const nextCanvases = cache.canvases.slice();
      for (const stIndex of changedSupertiles) {
        const stRow = Math.floor(stIndex / supertilesWide);
        const stCol = stIndex % supertilesWide;
        nextCanvases[stIndex] = buildSupertileFromTiles(
          stRow * tilesPerSupertile,
          stCol * tilesPerSupertile,
          header.mapWidth,
          header.mapHeight,
          layerData,
          xlatTable,
          tileImages,
          tilesPerSupertile,
          tileSize,
          stIndex === 0,
        );
      }

      const nextCache: BugdomSupertileCacheEntry = {
        ...cache,
        layerSnapshot: layerData.slice(),
        canvases: nextCanvases,
      };
      return { supertileImages: nextCanvases, nextCache };
    }, [
      headerData,
      terrainData.Layr,
      tileImages,
      xlatTable,
      tilesPerSupertile,
      tileSize,
      layerKey,
      header.mapWidth,
      header.mapHeight,
      supertilesDeep,
      supertilesWide,
    ]);

    useEffect(() => {
      bugdomSupertileCache = nextCache;
    }, [nextCache]);

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
