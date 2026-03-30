/**
 * IndividualTileSupertiles.tsx
 * 
 * Renders supertiles for games that use individual tiles (Bugdom 1, Nanosaur 1).
 * These games have Layr data containing individual tile indices and construct
 * supertiles at runtime from 5x5 grids of 32x32 pixel tiles.
 *
 * For Bugdom 1, levels with indoor sections (e.g. Level 6) also carry a second
 * Layr resource at key 1001 for the ceiling/roof tiles. The ShowRoofInTopology
 * atom (shared with the topology height overlay) is used to toggle which layer
 * is displayed in the tile canvas.
 */

import { memo } from "react";
import { useAtomValue } from "jotai";
import { TerrainData, HeaderData } from "@/python/structSpecs/LevelTypes";
import { Globals, Game } from "@/data/globals/globals";
import { ShowRoofInTopology } from "@/data/tiles/tileAtoms";
import { BugdomSupertiles } from "../bugdom/BugdomTileRenderer";

interface IndividualTileSupertilesProps {
  headerData: HeaderData;
  terrainData: TerrainData;
  mapImages: HTMLCanvasElement[];
}

export const IndividualTileSupertiles = memo(
  ({ headerData, terrainData, mapImages }: IndividualTileSupertilesProps) => {
    const globals = useAtomValue(Globals);
    const showRoof = useAtomValue(ShowRoofInTopology);
    const xlatTable = terrainData.Xlat?.[1000]?.obj;

    // Bugdom 1 can have a roof layer at Layr[1001]; only switch when it exists.
    const hasRoofLayer =
      globals.GAME_TYPE === Game.BUGDOM &&
      terrainData.Layr?.[1001] !== undefined;
    const layerKey: 1000 | 1001 = hasRoofLayer && showRoof ? 1001 : 1000;

    return (
      <BugdomSupertiles
        headerData={headerData}
        terrainData={terrainData}
        tileImages={mapImages}
        xlatTable={xlatTable}
        layerKey={layerKey}
      />
    );
  },
);

IndividualTileSupertiles.displayName = "IndividualTileSupertiles";
