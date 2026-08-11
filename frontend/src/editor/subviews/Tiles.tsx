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
import { Globals } from "@/data/globals/globals";
import {
  SelectedSemanticTileAttribute,
  TileAttributeOverlayOpacity,
} from "@/data/tiles/tileAtoms";
import { getSemanticTileAttributes } from "@/data/terrain/semanticTileAttributes";

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
  const globals = useAtomValue(Globals);
  const semanticAttributeId = useAtomValue(SelectedSemanticTileAttribute);
  const attributeOverlayOpacity = useAtomValue(TileAttributeOverlayOpacity);
  const tileGrid = useMemo(
    () => buildTileGrid(terrainData, globals.GAME_TYPE),
    [terrainData, globals.GAME_TYPE],
  );

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

  const semanticAttribute =
    tileViewMode === TileViews.Attributes
      ? getSemanticTileAttributes(globals.GAME_TYPE).find(
          (attribute) => attribute.id === semanticAttributeId,
        )
      : undefined;
  const flagBit = semanticAttribute?.mask ?? getTileFlagBit(tileViewMode);
  return (
    <FlagTileEditor
      headerData={headerData}
      setTerrainData={setTerrainData}
      tileGrid={tileGrid}
      game={globals.GAME_TYPE}
      flagBit={flagBit}
      flagField={semanticAttribute?.field ?? "flags"}
      opacity={
        tileViewMode === TileViews.Attributes ? attributeOverlayOpacity : 1
      }
      flagToColour={(flag) => flagToVisibilityRgba(flag, flagBit)}
    />
  );
}
