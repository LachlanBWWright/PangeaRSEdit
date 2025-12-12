/**
 * MightyMikeSupertiles.tsx
 * 
 * Renders tiles for Mighty Mike's 2D tile system.
 * Mighty Mike uses a simple 2D grid of tiles (no supertiles).
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

export const MightyMikeSupertiles = memo(
  ({ headerData, terrainData, mapImages }: MightyMikeSupertilesProps) => {
    const [selectedTile, setSelectedTile] = useAtom(SelectedTile);
    const header = headerData.Hedr[1000].obj;
    const layr = terrainData.Layr?.[1000]?.obj || [];
    
    const TILE_SIZE = 32;
    const mapWidth = header.mapWidth;
    const mapHeight = header.mapHeight;

    console.log("MightyMikeSupertiles: Rendering 2D tile grid", {
      mapWidth,
      mapHeight,
      layrLength: layr.length,
      mapImagesCount: mapImages.length,
    });

    return (
      <Layer>
        {layr.map((tileIndex, i) => {
          const x = (i % mapWidth) * TILE_SIZE;
          const y = Math.floor(i / mapWidth) * TILE_SIZE;
          const img = mapImages[tileIndex];
          const isSelected = selectedTile === i;
          
          if (!img) {
            // Draw black tile if no image available
            return null;
          }

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
  },
);

MightyMikeSupertiles.displayName = "MightyMikeSupertiles";
