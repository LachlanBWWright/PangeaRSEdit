<<<<<<< HEAD
/**
 * Supertiles.tsx
 * 
 * Main dispatcher component for rendering supertiles based on tile system type.
 * Detects whether the game uses individual tiles or pre-composed supertiles
 * and delegates to the appropriate specialized component.
 */

import { memo } from "react";
import { TerrainData, HeaderData } from "@/python/structSpecs/LevelTypes";
import { IndividualTileSupertiles } from "./supertiles/IndividualTileSupertiles";
import { StandardSupertiles } from "./supertiles/StandardSupertiles";

=======
import { ottoMaticLevel } from "../../python/structSpecs/ottoMaticInterface";
import { Layer, Image, Rect } from "react-konva";
import { Fragment, memo, useMemo } from "react";
import { SelectedTile } from "../../data/supertiles/supertileAtoms";
import { useAtom, useAtomValue } from "jotai";
import { Globals } from "../../data/globals/globals";

>>>>>>> origin/main
export const Supertiles = memo(
  ({
    data,
    mapImages,
  }: {
    data: ottoMaticLevel;
    mapImages: HTMLCanvasElement[];
  }) => {
<<<<<<< HEAD
    // Detect tile system based on data structure, not game type
    // Individual tile games (Bugdom 1, Nanosaur 1) have Layr data and possibly Xlat
    // Standard games have STgd with supertile grid data
    const hasLayr = Boolean(terrainData.Layr?.[1000]?.obj);
    const hasSTgd = Boolean(terrainData.STgd?.[1000]?.obj);
    const usesIndividualTiles = hasLayr && !hasSTgd;

    console.log("Supertiles dispatcher:", {
      usesIndividualTiles,
      hasLayr,
      hasSTgd,
      mapImagesCount: mapImages.length,
    });

    // For individual tile games (Bugdom 1, Nanosaur 1), use IndividualTileSupertiles
    // which constructs supertiles from individual 32x32 tiles
    if (usesIndividualTiles) {
      return (
        <IndividualTileSupertiles
          headerData={headerData}
          terrainData={terrainData}
          mapImages={mapImages}
        />
      );
    }

    // Standard supertile rendering for other games (requires STgd)
    if (!terrainData.STgd?.[1000]?.obj) {
      return null; // No supertile grid available
    }
=======
    //if (!data.Itms) return <></>;\
    const globals = useAtomValue(Globals);
    const [selectedTile, setSelectedTile] = useAtom(SelectedTile);
    const header = data.Hedr[1000].obj;
    const supertilesWide = header.mapWidth / globals.TILES_PER_SUPERTILE;
    const superTileGrid = data.STgd[1000].obj;
    const imageGrid = useMemo(() => {
      const imageArray: HTMLCanvasElement[] = [];
      for (const supertile of superTileGrid) {
        imageArray.push(mapImages[supertile.superTileId ?? supertile]);
      }
      return imageArray;
    }, [data.Hedr, data.STgd, mapImages]);
>>>>>>> origin/main

    return (
      <StandardSupertiles
        headerData={headerData}
        terrainData={terrainData}
        mapImages={mapImages}
      />
    );
  },
);

Supertiles.displayName = "Supertiles";
