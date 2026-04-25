import {
  TerrainData,
  HeaderData,
} from "@/python/structSpecs/LevelTypes";
import { Layer } from "react-konva";
import { Updater } from "use-immer";
import { TileViewMode, TileViews } from "../../data/tiles/tileAtoms";
import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { FlagTileEditor } from "./tiles/FlagTileEditor";
import { TopologyTiles } from "./tiles/TopologyTiles";
import {
  buildTileGrid,
  flagToVisibilityRgba,
  getTileFlagBit,
  hasTopologyData,
} from "@/editor/subviews/tileViewState";

export function Tiles({
  headerData,
  terrainData,
  setTerrainData,
  isEditingTopology,
}: {
  headerData: HeaderData;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  isEditingTopology: boolean;
}) {
  const tileViewMode = useAtomValue(TileViewMode);
  const tileGrid = useMemo(() => buildTileGrid(terrainData), [terrainData]);

  if (tileViewMode === TileViews.Topology) {
    if (!hasTopologyData(terrainData)) {
      return <Layer />;
    }
    return (
      <TopologyTiles
        headerData={headerData}
        terrainData={terrainData}
        setTerrainData={setTerrainData}
        isEditingTopology={isEditingTopology}
      />
    );
  }

  if (!tileGrid.length) {
    return <Layer />;
  }

  const flagBit = getTileFlagBit(tileViewMode);
  return (
    <FlagTileEditor
      headerData={headerData}
      setTerrainData={setTerrainData}
      tileGrid={tileGrid}
      flagBit={flagBit}
      flagToColour={(flag) => flagToVisibilityRgba(flag, flagBit)}
    />
  );
}
