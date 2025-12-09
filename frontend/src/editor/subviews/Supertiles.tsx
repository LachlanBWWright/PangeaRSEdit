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
      usesIndividualTiles:
        globals.GAME_TYPE === Game.BUGDOM ||
        globals.GAME_TYPE === Game.NANOSAUR,
      hasLayr: !!terrainData.Layr,
      hasSTgd: !!terrainData.STgd,
      hasXlat: !!terrainData.Xlat,
      mapImagesCount: mapImages.length,
    });

    const imageGrid = useMemo(() => {
      const superTileGrid = terrainData.STgd?.[1000]?.obj ?? [];
      // Keep array index aligned with supertileGrid positions so Konva layout
      // doesn't get compressed when tiles are empty. We store `null` when
      // a supertile has no image so the layout math still uses the same index.
      const imageArray: (HTMLCanvasElement | null)[] = new Array(
        superTileGrid.length,
      ).fill(null);
      for (let idx = 0; idx < superTileGrid.length; idx++) {
        const supertile = superTileGrid[idx] as unknown;
        // supertile may be an object { superTileId } or a number in simplified format
        const id =
          typeof supertile === "object" &&
          supertile !== null &&
          "superTileId" in (supertile as Record<string, unknown>)
            ? (supertile as { superTileId: number }).superTileId
            : (supertile as number);
        const img = mapImages[id] ?? null;
        imageArray[idx] = img;
      }
      return imageArray;
    }, [mapImages, terrainData.STgd]);

    // For Bugdom 1 and Nanosaur 1, use the BugdomSupertiles component which constructs
    // supertiles from individual 32x32 tiles (optionally using Xlat translation table)
    if (
      globals.GAME_TYPE === Game.BUGDOM ||
      globals.GAME_TYPE === Game.NANOSAUR
    ) {
      const xlatTable = terrainData.Xlat?.[1000]?.obj;
      console.log(
        "Supertiles: Using BugdomSupertiles for individual tile rendering",
        {
          game: globals.GAME_NAME,
          xlatTableLength: xlatTable?.length,
        },
      );

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

    //Create blank image
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
