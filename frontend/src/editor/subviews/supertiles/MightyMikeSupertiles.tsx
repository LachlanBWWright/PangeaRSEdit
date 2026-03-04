/**
 * MightyMikeSupertiles.tsx
 *
 * Renders tiles for Mighty Mike's 2D tile system.
 * Mighty Mike uses a simple 2D grid of tiles (no supertiles).
 * Tiles are indexed through a translation (xlate) table to map logical indices to physical tile images.
 */

import { Layer, Image, Rect } from "react-konva";
import { Fragment, memo, useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import { SelectedTile } from "@/data/supertiles/supertileAtoms";
import { CollisionBrushMode } from "@/data/game/gameAtoms";
import { TerrainData, HeaderData } from "@/python/structSpecs/LevelTypes";
import { Updater } from "use-immer";

// Type guard helpers
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function getBoolean(value: unknown, defaultValue = false): boolean {
  return typeof value === 'boolean' ? value : defaultValue;
}

interface MightyMikeSupertilesProps {
  headerData: HeaderData;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  mapImages: HTMLCanvasElement[];
  showCollisionOverlay?: boolean;
}

const MightyMikeSupertilesComponent = ({
  headerData,
  terrainData,
  setTerrainData,
  mapImages,
  showCollisionOverlay = false,
}: MightyMikeSupertilesProps) => {
  const [selectedTile, setSelectedTile] = useAtom(SelectedTile);
  const collisionBrushMode = useAtomValue(CollisionBrushMode);
  const header = headerData.Hedr[1000].obj;
  const layr = terrainData.Layr?.[1000]?.obj || [];
  const xlatTable = terrainData.Xlat?.[1000]?.obj;

  // Access Mighty Mike tile values from the raw terrainData if available
  const metadata = isRecord(terrainData._metadata) ? terrainData._metadata : undefined;
  const metadataEntry = metadata && isRecord(metadata[1000]) ? metadata[1000] : undefined;
  const metadataObj = metadataEntry && isRecord(metadataEntry.obj) ? metadataEntry.obj : undefined;
  const mightyMikeTileValuesArray = metadataObj && isArray(metadataObj.mightyMikeTileValues)
    ? metadataObj.mightyMikeTileValues
    : [];

  // Extract per-tile pixel-accurate collision canvases from the stored tileset
  const tilesetRaw = isRecord(terrainData.tileset) ? terrainData.tileset : undefined;
  const rawCollisionImages = tilesetRaw && isArray(tilesetRaw.collisionImages) ? tilesetRaw.collisionImages : [];
  const collisionImages = rawCollisionImages.filter(
    (img): img is HTMLCanvasElement => isRecord(img) && typeof img.getContext === "function",
  );

  // Brush handler: toggle hasCollisionMask for a tile
  const handleBrushTile = useCallback((tileIdx: number) => {
    setTerrainData((data) => {
      const meta = isRecord(data._metadata) && isRecord(data._metadata[1000]) && isRecord(data._metadata[1000].obj)
        ? data._metadata[1000].obj
        : undefined;
      const tileValues = meta && isArray(meta.mightyMikeTileValues) ? meta.mightyMikeTileValues : undefined;
      if (!tileValues || tileIdx < 0 || tileIdx >= tileValues.length) return;
      const tileVal = tileValues[tileIdx];
      if (!isRecord(tileVal)) return;
      tileVal.hasCollisionMask = !tileVal.hasCollisionMask;
    });
  }, [setTerrainData]);

  const TILE_SIZE = 32;
  const mapWidth = header.mapWidth;

  // If we have tile images, render them directly
  // mapImages contains the actual HTMLCanvasElement tiles from the tileset
  if (mapImages.length === 0) {
    console.warn(
      "MightyMikeSupertiles: No tile images available - tiles cannot render",
    );
    return <Layer />;
  }

  // Check if layr is empty
  if (layr.length === 0) {
    console.warn(
      "MightyMikeSupertiles: Layr array is empty - no tiles to render",
    );
    return <Layer />;
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
                if (collisionBrushMode) {
                  handleBrushTile(i);
                } else {
                  setSelectedTile(i);
                }
              }}
              onMouseEnter={(e) => {
                if (collisionBrushMode && e.evt.buttons === 1) handleBrushTile(i);
              }}
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
            {showCollisionOverlay &&
              mightyMikeTileValuesArray.length > 0 &&
              i < mightyMikeTileValuesArray.length && (() => {
                const tileValue = mightyMikeTileValuesArray[i];
                if (!isRecord(tileValue)) return null;
                const hasCollisionMask = getBoolean(tileValue.hasCollisionMask);
                const usePixelAccurateCollision = getBoolean(tileValue.usePixelAccurateCollision);

                if (!hasCollisionMask) return null;

                // For pixel-accurate collision, use the pre-generated collision canvas
                // (orange only where palette index is collidable, transparent elsewhere).
                if (usePixelAccurateCollision && imageIndex < collisionImages.length) {
                  const collisionImg = collisionImages[imageIndex];
                  if (collisionImg) {
                    return (
                      <Image
                        key={`collision-${i}`}
                        image={collisionImg}
                        x={x}
                        y={y}
                        width={TILE_SIZE}
                        height={TILE_SIZE}
                        listening={false}
                      />
                    );
                  }
                }

                // Tile-based collision: solid blue overlay
                return (
                  <Rect
                    key={`collision-${i}`}
                    x={x}
                    y={y}
                    width={TILE_SIZE}
                    height={TILE_SIZE}
                    fill="rgba(30, 100, 255, 0.35)"
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
