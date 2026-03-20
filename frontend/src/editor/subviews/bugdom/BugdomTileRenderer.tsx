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

    // Build all supertile images from individual tiles
    const supertileImages = useMemo(() => {
      if (!terrainData.Layr?.[layerKey]?.obj || tileImages.length === 0) {
        return [];
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

      return buildAllBugdomSupertiles(
        headerData,
        terrainData.Layr[layerKey].obj,
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
      layerKey,
      ]);

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
