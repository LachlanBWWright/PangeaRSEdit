/**
 * IndividualTileSupertiles.tsx
 * 
 * Renders supertiles for games that use individual tiles (Bugdom 1, Nanosaur 1).
 * These games have Layr data containing individual tile indices and construct
 * supertiles at runtime from 5x5 grids of 32x32 pixel tiles.
 */

import { memo } from "react";
import { TerrainData, HeaderData } from "@/python/structSpecs/LevelTypes";
import { BugdomSupertiles } from "../bugdom/BugdomTileRenderer";

interface IndividualTileSupertilesProps {
  headerData: HeaderData;
  terrainData: TerrainData;
  mapImages: HTMLCanvasElement[];
}

export const IndividualTileSupertiles = memo(
  ({ headerData, terrainData, mapImages }: IndividualTileSupertilesProps) => {
    const xlatTable = terrainData.Xlat?.[1000]?.obj;
    
    console.log(
      "IndividualTileSupertiles: Rendering individual tile system",
      { 
        xlatTableLength: xlatTable?.length,
        mapImagesCount: mapImages.length,
        hasLayr: !!terrainData.Layr?.[1000]?.obj,
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
  },
);

IndividualTileSupertiles.displayName = "IndividualTileSupertiles";
