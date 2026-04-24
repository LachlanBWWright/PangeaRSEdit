import {
  TileAttribute,
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

/* 

  Tile attribs p0 and p1 are NOT used!

TILE_ATTRIB_BLANK=1, 
TILE_ATTRIB_ELECTROCUTE_AREA0=(1<<1),
TILE_ATTRIB_ELECTROCUTE_AREA1=(1<<2)

*/

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

  const tileGrid = useMemo(() => {
    // If no Atrb data or Layr doesn't reference Atrb, return empty array
    const layrData = terrainData.Layr?.[1000]?.obj;
    const atrbData = terrainData.Atrb?.[1000]?.obj;
    if (!atrbData || !layrData) {
      return [];
    }
    return layrData
      .map((atrbIdx: number) => atrbData[atrbIdx])
      .filter((tile): tile is TileAttribute => tile !== undefined);
  }, [terrainData.Layr, terrainData.Atrb]);

  // For Topology view, check if YCrd data exists
  if (tileViewMode === TileViews.Topology) {
    // Check if YCrd data exists and has content
    if (!terrainData.YCrd?.[1000]?.obj?.length) {
      return <Layer>{/* No topology data available for this game */}</Layer>;
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

  // For other tile views, check if tileGrid has data
  if (!tileGrid.length) {
    return (
      <Layer>{/* No tile attribute data available for this game */}</Layer>
    );
  }

  if (tileViewMode === TileViews.Flags)
    return (
      <FlagTileEditor
        headerData={headerData}
        setTerrainData={setTerrainData}
        tileGrid={tileGrid}
        flagBit={1}
        flagToColour={(flag) =>
          flag & 1 ? [255, 255, 255, 255] : [0, 0, 0, 0]
        }
      />
    );
  if (tileViewMode === TileViews.ElectricFloor0)
    return (
      <FlagTileEditor
        headerData={headerData}
        setTerrainData={setTerrainData}
        tileGrid={tileGrid}
        flagBit={1 << 1}
        flagToColour={(flag) =>
          flag & (1 << 1) ? [255, 255, 255, 255] : [0, 0, 0, 0]
        }
      />
    );

  return (
    <FlagTileEditor
      headerData={headerData}
      setTerrainData={setTerrainData}
      tileGrid={tileGrid}
      flagBit={1 << 2}
      flagToColour={(flag) =>
        flag & (1 << 2) ? [255, 255, 255, 255] : [0, 0, 0, 0]
      }
    />
  );
}
