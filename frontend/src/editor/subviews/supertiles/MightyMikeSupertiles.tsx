/**
 * MightyMikeSupertiles.tsx
 *
 * Renders tiles for Mighty Mike's 2D tile system.
 * Mighty Mike uses a simple 2D grid of tiles (no supertiles).
 * Tiles are indexed through a translation (xlate) table to map logical indices to physical tile images.
 */

import { Layer, Image, Rect } from "react-konva";
import { Fragment, memo } from "react";
import { useAtom } from "jotai";
import { SelectedTile } from "@/data/supertiles/supertileAtoms";
import { TerrainData, HeaderData } from "@/python/structSpecs/LevelTypes";

interface MightyMikeSupertilesProps {
  headerData: HeaderData;
  terrainData: TerrainData;
  mapImages: HTMLCanvasElement[];
  showCollisionOverlay?: boolean;
}

const MightyMikeSupertilesComponent = ({
  headerData,
  terrainData,
  mapImages,
  showCollisionOverlay = false,
}: MightyMikeSupertilesProps) => {
  const [selectedTile, setSelectedTile] = useAtom(SelectedTile);
  const header = headerData.Hedr[1000].obj;
  const layr = terrainData.Layr?.[1000]?.obj || [];
  const xlatTable = terrainData.Xlat?.[1000]?.obj;

  // Access Mighty Mike tile values from the _metadata field if available
  // These are stored during parsing and contain collision info
  const mightyMikeTileValuesArray =
    terrainData._metadata?.mightyMikeTileValues || [];

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

  // Debug: Sample the actual tile canvas data to verify colors
  if (mapImages.length > 0 && mapImages[0]) {
    const sampleCanvas = mapImages[0];
    const ctx = sampleCanvas?.getContext("2d");
    if (ctx && sampleCanvas) {
      const imageData = ctx.getImageData(
        0,
        0,
        Math.min(4, sampleCanvas.width),
        Math.min(4, sampleCanvas.height),
      );
      const pixels = imageData.data;
      // Sample first few pixels
      const samples = [];
      for (let i = 0; i < Math.min(4 * 4, pixels.length); i += 4) {
        if (i + 3 < pixels.length) {
          samples.push(
            `Pixel${i / 4}: RGBA(${pixels[i]},${pixels[i + 1]},${
              pixels[i + 2]
            },${pixels[i + 3]})`,
          );
        }
      }
      console.log(
        "[TILE CANVAS] First tile canvas (tile 0) sample pixels:",
        samples,
      );
    }
  }

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

  return (
    <Layer>
      {layr.map((logicalTileIndex, i) => {
        const x = (i % mapWidth) * TILE_SIZE;
        const y = Math.floor(i / mapWidth) * TILE_SIZE;

        // The Layr contains logical tile indices (0-2047) after TILENUM_MASK was applied during parsing
        // Use xlate table to translate to actual image indices if available
        let imageIndex = logicalTileIndex;
        let translatedFromXlat = false;

        // Check if logical index is within bounds (0-2047)
        if (logicalTileIndex < 0 || logicalTileIndex >= 2048) {
          console.warn(
            `Invalid logical tile index in Layr[${i}]: ${logicalTileIndex} (expected 0-2047). This indicates corrupted map data.`,
          );
          return null;
        }

        // Try to use xlate table for translation
        if (xlatTable && logicalTileIndex < xlatTable.length) {
          const xlatEntry = xlatTable[logicalTileIndex];
          if (
            xlatEntry &&
            typeof xlatEntry === "object" &&
            "idx" in xlatEntry
          ) {
            imageIndex = xlatEntry.idx;
            translatedFromXlat = true;
          }
        }

        // Validate the final physical image index
        if (imageIndex < 0 || imageIndex >= mapImages.length) {
          const source = translatedFromXlat
            ? `Xlat[${logicalTileIndex}]`
            : `Layr (logical index)`;
          console.warn(
            `Invalid physical tile image index: ${imageIndex} from ${source} (max available: ${
              mapImages.length - 1
            }). Xlat table: ${xlatTable?.length || 0} entries.`,
          );
          return null;
        }

        const img = mapImages[imageIndex];
        const isSelected = selectedTile === i;

        if (!img) {
          // Draw a placeholder if no image available
          return null;
        }

        return (
          <Fragment key={i}>
            <Image
              image={img}
              onClick={() => {
                setSelectedTile(i);
              }}
              x={x}
              y={y}
              width={TILE_SIZE}
              height={TILE_SIZE}
            />
            {isSelected && (
              <Image
                image={img}
                onClick={() => {
                  setSelectedTile(i);
                }}
                x={x}
                y={y}
                width={TILE_SIZE}
                height={TILE_SIZE}
                stroke="red"
                strokeWidth={2}
              />
            )}
            {showCollisionOverlay &&
              mightyMikeTileValuesArray.length > 0 &&
              i < mightyMikeTileValuesArray.length &&
              (() => {
                const tileValue = mightyMikeTileValuesArray[i];

                const hasCollisionMask = tileValue?.hasCollisionMask || false;
                const usePixelAccurateCollision =
                  tileValue?.usePixelAccurateCollision || false;

                if (!hasCollisionMask) return null;

                // Different colors for different collision types
                const color = usePixelAccurateCollision
                  ? "rgba(0, 255, 0, 0.3)" // Green for pixel-accurate
                  : "rgba(255, 165, 0, 0.3)"; // Orange for tile-based

                return (
                  <Rect
                    key={`collision-${i}`}
                    x={x}
                    y={y}
                    width={TILE_SIZE}
                    height={TILE_SIZE}
                    fill={color}
                    listening={false}
                  />
                );
              })()}
          </Fragment>
        );
      })}
    </Layer>
  );
};

export const MightyMikeSupertiles = memo(MightyMikeSupertilesComponent);
MightyMikeSupertiles.displayName = "MightyMikeSupertiles";
