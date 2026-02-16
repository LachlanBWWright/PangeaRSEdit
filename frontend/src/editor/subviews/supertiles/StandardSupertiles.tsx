/**
 * StandardSupertiles.tsx
 * 
 * Renders pre-composed supertiles for standard games (Otto Matic, Bugdom 2, 
 * Nanosaur 2, etc.). These games have STgd data containing supertile grid
 * indices that map directly to pre-rendered supertile images.
 */

import { Layer, Image, Rect } from "react-konva";
import { Fragment, memo, useMemo } from "react";
import { SelectedTile } from "@/data/supertiles/supertileAtoms";
import { useAtom, useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";
import { TerrainData, HeaderData } from "@/python/structSpecs/LevelTypes";

interface StandardSupertilesProps {
  headerData: HeaderData;
  terrainData: TerrainData;
  mapImages: HTMLCanvasElement[];
}

export const StandardSupertiles = memo(
  ({ headerData, terrainData, mapImages }: StandardSupertilesProps) => {
    const globals = useAtomValue(Globals);
    const [selectedTile, setSelectedTile] = useAtom(SelectedTile);
    const header = headerData.Hedr[1000].obj;
    const supertilesWide = header.mapWidth / globals.TILES_PER_SUPERTILE;

    const imageGrid = useMemo(() => {
      const superTileGrid = terrainData.STgd?.[1000]?.obj ?? [];
      // Keep array index aligned with supertileGrid positions so Konva layout
      // doesn't get compressed when tiles are empty. We store `null` when
      // a supertile has no image so the layout math still uses the same index.
      const imageArray: (HTMLCanvasElement | null)[] = new Array(
        superTileGrid.length,
      ).fill(null);
      
      function isSuperTileObj(x: unknown): x is { superTileId: number } {
        return (
          typeof x === 'object' &&
          x !== null &&
          'superTileId' in x &&
          typeof (x as Record<string, unknown>)['superTileId'] === 'number'
        );
      }

      for (let idx = 0; idx < superTileGrid.length; idx++) {
        const supertile = superTileGrid[idx];
        let id = -1;
        if (isSuperTileObj(supertile)) {
          id = supertile.superTileId;
        } else if (typeof supertile === 'number') {
          id = supertile;
        }
        const img = mapImages[id] ?? null;
        imageArray[idx] = img;
      }
      
      return imageArray;
    }, [mapImages, terrainData.STgd]);

    return (
      <Layer>
        {imageGrid.map((img, i) => {
          const isSelected = selectedTile === i;
          return (
            <Fragment key={i}>
              {img ? (
                <Image
                  image={img}
                  onClick={() => setSelectedTile(i)}
                  x={
                    (i * globals.SUPERTILE_TEXMAP_SIZE) %
                    (globals.SUPERTILE_TEXMAP_SIZE * supertilesWide)
                  }
                  y={
                    Math.floor(i / supertilesWide) *
                    globals.SUPERTILE_TEXMAP_SIZE
                  }
                  width={globals.SUPERTILE_TEXMAP_SIZE}
                  height={globals.SUPERTILE_TEXMAP_SIZE}
                  fill={isSelected ? "red" : ""}
                />
              ) : (
                <Rect
                  onClick={() => setSelectedTile(i)}
                  x={
                    (i * globals.SUPERTILE_TEXMAP_SIZE) %
                    (globals.SUPERTILE_TEXMAP_SIZE * supertilesWide)
                  }
                  y={
                    Math.floor(i / supertilesWide) *
                    globals.SUPERTILE_TEXMAP_SIZE
                  }
                  width={globals.SUPERTILE_TEXMAP_SIZE}
                  height={globals.SUPERTILE_TEXMAP_SIZE}
                  fill="black"
                />
              )}
              {isSelected && (
                <Rect
                  onClick={() => setSelectedTile(i)}
                  x={
                    (i * globals.SUPERTILE_TEXMAP_SIZE) %
                    (globals.SUPERTILE_TEXMAP_SIZE * supertilesWide)
                  }
                  y={
                    Math.floor(i / supertilesWide) *
                    globals.SUPERTILE_TEXMAP_SIZE
                  }
                  width={globals.SUPERTILE_TEXMAP_SIZE}
                  height={globals.SUPERTILE_TEXMAP_SIZE}
                  stroke="red"
                />
              )}
            </Fragment>
          );
        })}
      </Layer>
    );
  },
);

StandardSupertiles.displayName = "StandardSupertiles";
