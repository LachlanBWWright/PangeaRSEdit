/**
 * MightyMikeSupertiles.tsx
 *
 * Renders tiles for Mighty Mike's 2D tile system.
 * Mighty Mike uses a simple 2D grid of tiles (no supertiles).
 * Tiles are indexed through a translation (xlate) table to map logical indices to physical tile images.
 */

import { Layer, Image } from "react-konva";
import { Fragment, memo } from "react";
import { useAtom } from "jotai";
import { SelectedTile } from "@/data/supertiles/supertileAtoms";
import { TerrainData, HeaderData } from "@/python/structSpecs/LevelTypes";

interface MightyMikeSupertilesProps {
  headerData: HeaderData;
  terrainData: TerrainData;
  mapImages: HTMLCanvasElement[];
}

const MightyMikeSupertilesComponent = ({
  headerData,
  terrainData,
  mapImages,
}: MightyMikeSupertilesProps) => {
  const [selectedTile, setSelectedTile] = useAtom(SelectedTile);
  const header = headerData.Hedr[1000].obj;
  const layr = terrainData.Layr?.[1000]?.obj || [];
  const xlatTable = terrainData.Xlat?.[1000]?.obj;

  const TILE_SIZE = 32;
  const mapWidth = header.mapWidth;
  const mapHeight = header.mapHeight;

  console.log("MightyMikeSupertiles: Rendering 2D tile grid", {
    mapWidth,
    mapHeight,
    layrLength: layr.length,
    mapImagesCount: mapImages.length,
    hasXlatTable: !!xlatTable,
    xlatTableLength: xlatTable?.length || 0,
    mapImagesType: mapImages[0]?.constructor?.name || "unknown",
  });

  // If we have tile images, render them directly
  // mapImages contains the actual HTMLCanvasElement tiles from the tileset
  if (mapImages.length === 0) {
    console.warn(
      "MightyMikeSupertiles: No tile images available - tiles cannot render",
    );
    console.warn("mapImages array:", mapImages);
    return <Layer />;
  }

  // Check if layr is empty
  if (layr.length === 0) {
    console.warn(
      "MightyMikeSupertiles: Layr array is empty - no tiles to render",
    );
    return <Layer />;
  }

  // Validate xlate table if present
  if (xlatTable && xlatTable.length > 0) {
    console.log(
      "MightyMikeSupertiles: Using xlate table for tile translation",
      {
        xlatTableLength: xlatTable.length,
        firstXlatEntries: xlatTable.slice(0, 10).map((x, i) => ({
          index: i,
          imageIdx: x.idx,
        })),
      },
    );
  }

  let validTileCount = 0;
  let invalidTileCount = 0;
  let emptyImageCount = 0;

  return (
    <Layer>
      {layr.map((tileIndexValue, i) => {
        const x = (i % mapWidth) * TILE_SIZE;
        const y = Math.floor(i / mapWidth) * TILE_SIZE;

        // The Layr contains logical tile indices
        // Use xlate table to translate to actual image indices if available
        let imageIndex = tileIndexValue;
        if (
          xlatTable &&
          tileIndexValue >= 0 &&
          tileIndexValue < xlatTable.length
        ) {
          const xlatEntry = xlatTable[tileIndexValue];
          if (
            xlatEntry &&
            typeof xlatEntry === "object" &&
            "idx" in xlatEntry
          ) {
            imageIndex = xlatEntry.idx;
          }
        }

        // Now imageIndex should point to the correct tile image
        if (imageIndex < 0 || imageIndex >= mapImages.length) {
          invalidTileCount++;
          if (invalidTileCount <= 5) {
            console.warn(
              `Invalid tile image index: ${imageIndex} (from logical index ${tileIndexValue}, max: ${
                mapImages.length - 1
              })`,
            );
          }
          return null;
        }

        const img = mapImages[imageIndex];
        const isSelected = selectedTile === i;

        if (!img) {
          // Draw a placeholder if no image available
          emptyImageCount++;
          return null;
        }

        validTileCount++;

        return (
          <Fragment key={i}>
            <Image
              image={img}
              onClick={() => setSelectedTile(i)}
              x={x}
              y={y}
              width={TILE_SIZE}
              height={TILE_SIZE}
            />
            {isSelected && (
              <Image
                image={img}
                onClick={() => setSelectedTile(i)}
                x={x}
                y={y}
                width={TILE_SIZE}
                height={TILE_SIZE}
                stroke="red"
                strokeWidth={2}
              />
            )}
          </Fragment>
        );
      })}
    </Layer>
  );
};

export const MightyMikeSupertiles = memo(MightyMikeSupertilesComponent);
MightyMikeSupertiles.displayName = "MightyMikeSupertiles";
