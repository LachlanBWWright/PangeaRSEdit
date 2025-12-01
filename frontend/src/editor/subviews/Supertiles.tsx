import { Layer, Image, Rect } from "react-konva";
import { Fragment, memo, useMemo } from "react";
import { SelectedTile } from "../../data/supertiles/supertileAtoms";
import { useAtom, useAtomValue } from "jotai";
import { Game, Globals } from "../../data/globals/globals";

import {
  TerrainData,
  HeaderData,
} from "../../python/structSpecs/ottoMaticLevelData";
import { BugdomSupertiles } from "./bugdom/BugdomTileRenderer";

export const Supertiles = memo(
  ({
    headerData,
    terrainData,
    mapImages,
  }: {
    headerData: HeaderData;
    terrainData: TerrainData;
    mapImages: HTMLCanvasElement[];
  }) => {
    const globals = useAtomValue(Globals);
    const [selectedTile, setSelectedTile] = useAtom(SelectedTile);
    const header = headerData.Hedr[1000].obj;
    const supertilesWide = header.mapWidth / globals.TILES_PER_SUPERTILE;

    console.log("Supertiles component render:", {
      gameType: globals.GAME_TYPE,
      usesIndividualTiles: globals.GAME_TYPE === Game.BUGDOM || globals.GAME_TYPE === Game.NANOSAUR,
      hasLayr: !!terrainData.Layr,
      hasSTgd: !!terrainData.STgd,
      hasXlat: !!terrainData.Xlat,
      mapImagesCount: mapImages.length,
    });

    // For Bugdom 1 and Nanosaur 1, use the BugdomSupertiles component which constructs
    // supertiles from individual 32x32 tiles (optionally using Xlat translation table)
    if (globals.GAME_TYPE === Game.BUGDOM || globals.GAME_TYPE === Game.NANOSAUR) {
      const xlatTable = terrainData.Xlat?.[1000]?.obj;
      console.log("Supertiles: Using BugdomSupertiles for individual tile rendering", {
        game: globals.GAME_NAME,
        xlatTableLength: xlatTable?.length,
      });

      return (
        <BugdomSupertiles
          headerData={headerData}
          terrainData={terrainData}
          tileImages={mapImages}
          xlatTable={xlatTable}
        />
      );
    }

    // Standard supertile rendering for other games (requires STgd)
    if (!terrainData.STgd?.[1000]?.obj) {
      return null; // No supertile grid available
    }

    const superTileGrid = terrainData.STgd[1000].obj;
    const imageGrid = useMemo(() => {
      const imageArray: HTMLCanvasElement[] = [];
      for (const supertile of superTileGrid) {
        imageArray.push(mapImages[supertile.superTileId ?? supertile]);
      }
      return imageArray;
    }, [headerData.Hedr, terrainData.STgd, mapImages]);

    //Create blank image
    return (
      <Layer>
        {imageGrid.map((img, i) => {
          const isSelected = selectedTile === i;

          return (
            <Fragment key={i}>
              <Image
                image={img}
                onClick={() => setSelectedTile(i)}
                x={
                  (i * globals.SUPERTILE_TEXMAP_SIZE) %
                  (globals.SUPERTILE_TEXMAP_SIZE * supertilesWide)
                }
                y={
                  Math.floor(i / supertilesWide) * globals.SUPERTILE_TEXMAP_SIZE
                }
                width={globals.SUPERTILE_TEXMAP_SIZE}
                height={globals.SUPERTILE_TEXMAP_SIZE}
                fill={isSelected ? "red" : ""}
              />
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
