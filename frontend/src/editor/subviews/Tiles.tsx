import { TileAttribute } from "@/python/structSpecs/LevelTypes";
import {
  TerrainData,
  HeaderData,
} from "@/python/structSpecs/LevelTypes";
import { Layer, Image } from "react-konva";
import { Updater } from "use-immer";
import {
  CurrentTopologyBrushMode,
  CurrentTopologyValueMode,
  TileViewMode,
  TileViews,
  TopologyBrushRadius,
  TopologyOpacity,
  TopologyValue,
  TileEditingEnabled,
  TileBrushType,
} from "../../data/tiles/tileAtoms";
import { useAtomValue } from "jotai";
import { Globals } from "../../data/globals/globals";
import { useMemo } from "react";
import { createImageCanvas } from "./tiles/tilesUtils";
import { elevationToRGBA } from "./tiles/tilesUtils";
import { KonvaEventObject } from "konva/lib/Node";
import { calculateBrushPixels, applyTopologyBrush, PixelType } from "../utils/topologyBrushUtils";

/* 

  Tile attribs p0 and p1 are NOT used!

	TILE_ATTRIB_BLANK				=	1, 
	TILE_ATTRIB_ELECTROCUTE_AREA0	=	(1<<1),
	TILE_ATTRIB_ELECTROCUTE_AREA1	=	(1<<2)

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

  // Check data structure to determine tile type rather than game type
  // Games with individual tiles have Layr containing tile indices but no Atrb tile attributes
  // Standard games have Atrb with tile flags
  const hasAtrbData = Boolean(terrainData.Atrb?.[1000]?.obj?.length);
  const hasLayrData = Boolean(terrainData.Layr?.[1000]?.obj);

  const tileGrid = useMemo(() => {
    // If no Atrb data or Layr doesn't reference Atrb, return empty array
    if (!hasAtrbData || !hasLayrData) {
      return [];
    }
    return terrainData.Layr[1000].obj
      .map((atrbIdx: number) => terrainData.Atrb[1000].obj[atrbIdx])
      .filter((tile): tile is TileAttribute => tile !== undefined);
  }, [terrainData.Layr, terrainData.Atrb, hasAtrbData, hasLayrData]);

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
      <EmptyTiles
        headerData={headerData}
        setTerrainData={setTerrainData}
        tileGrid={tileGrid}
      />
    );
  if (tileViewMode === TileViews.ElectricFloor0)
    return (
      <ElectricFloor0Tiles
        headerData={headerData}
        setTerrainData={setTerrainData}
        tileGrid={tileGrid}
      />
    );

  //ElectricFloor1

  return (
    <ElectricFloor1Tiles
      headerData={headerData}
      setTerrainData={setTerrainData}
      tileGrid={tileGrid}
    />
  );
}

export function TopologyTiles({
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
  const currentTopologyBrushMode = useAtomValue(CurrentTopologyBrushMode);
  const currentTopologyValueMode = useAtomValue(CurrentTopologyValueMode);
  const topologyValue = useAtomValue(TopologyValue);
  const topologyBrushRadius = useAtomValue(TopologyBrushRadius);
  const globals = useAtomValue(Globals);
  const opacity = useAtomValue(TopologyOpacity);

  const header = useMemo(() => headerData.Hedr[1000].obj, [headerData.Hedr]);

  // Guard against missing or empty YCrd data
  const yCrdData = terrainData.YCrd?.[1000]?.obj;

  // Use pure helper functions from tilesUtils to avoid recreating closures

  const coordColours = useMemo(() => {
    if (!yCrdData || yCrdData.length === 0) {
      // Return a minimal valid array for empty data
      return [128, 128, 128, 255];
    }
    return yCrdData.flatMap((e) => elevationToRGBA(header, e));
  }, [yCrdData, header]);

  const imgCanvas = useMemo(() => {
    // Guard against empty data - create a 1x1 placeholder
    if (!yCrdData || yCrdData.length === 0) {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      return canvas;
    }
    const result = createImageCanvas(
      header.mapWidth + 1,
      header.mapHeight + 1,
      coordColours,
    );
    if (!result.ok) {
      console.error("Failed to create image canvas:", result.error.message);
      return null;
    }
    return result.value;
  }, [header, coordColours, yCrdData]);

  const setPixels = (pixelList: PixelType[]) => {
    // Guard against missing YCrd data
    if (!yCrdData || yCrdData.length === 0) return;

    setTerrainData((data) => {
      if (!data.YCrd?.[1000]?.obj) return;

      // Use shared brush application utility
      applyTopologyBrush(data.YCrd[1000].obj, pixelList, {
        centerX: 0, // Not used in applyTopologyBrush
        centerY: 0, // Not used in applyTopologyBrush
        radius: (topologyBrushRadius - 1) * globals.TILE_SIZE,
        brushMode: currentTopologyBrushMode,
        valueMode: currentTopologyValueMode,
        value: topologyValue,
        header,
        globals,
        tileSize: globals.TILE_SIZE,
      });
    });
  };

  return (
    <Layer imageSmoothingEnabled={false}>
      {imgCanvas && (
        <Image
          x={0}
          y={0}
          opacity={opacity}
          width={(header.mapWidth + 1) * globals.TILE_SIZE}
          height={(header.mapHeight + 1) * globals.TILE_SIZE}
          onClick={(e) => {
            if (!isEditingTopology) return;
            const pos = e.target.getStage()?.getRelativePointerPosition();
            if (!pos) return;

            const centerX = Math.round(pos.x);
            const centerY = Math.round(pos.y);
            const radius = (topologyBrushRadius - 1) * globals.TILE_SIZE;
            
            // Use shared brush calculation utility
            const pixelList = calculateBrushPixels({
              centerX,
              centerY,
              radius,
              brushMode: currentTopologyBrushMode,
              valueMode: currentTopologyValueMode,
              value: topologyValue,
              header,
              globals,
              tileSize: globals.TILE_SIZE,
            });

            setPixels(pixelList);
          }}
          image={imgCanvas}
        />
      )}
    </Layer>
  );
}

export function EmptyTiles({
  headerData,
  setTerrainData,
  tileGrid,
}: {
  headerData: HeaderData;
  setTerrainData: Updater<TerrainData>;
  tileGrid: TileAttribute[];
}) {
  const globals = useAtomValue(Globals);
  // Use Jotai atoms for tile editing state
  const tileEditingEnabled = useAtomValue(TileEditingEnabled);
  const brushType = useAtomValue(TileBrushType);
  const topologyBrushRadius = useAtomValue(TopologyBrushRadius);

  const header = useMemo(() => headerData.Hedr[1000].obj, [headerData.Hedr]);

  const flagToColour = (flag: number) => {
    //TILE_ATTRB_BLANK
    if (flag & 1) return [255, 255, 255, 255];
    return [0, 0, 0, 0];
  };

  const coordColours = useMemo(() => {
    return tileGrid.flatMap((tile) => flagToColour(tile.flags));
  }, [tileGrid]);

  const imgCanvas = useMemo(() => {
    if (!header) return null;
    const result = createImageCanvas(
      header.mapWidth,
      header.mapHeight,
      coordColours,
    );
    if (!result.ok) {
      console.error("Failed to create image canvas:", result.error.message);
      return null;
    }
    return result.value;
  }, [header, coordColours]);

  const handleTileClickEvent = (e: KonvaEventObject<MouseEvent>) => {
    if (!tileEditingEnabled) return;

    const pos = e.target.getStage()?.getRelativePointerPosition();
    if (!pos) return;

    const centerX = Math.round(pos.x / globals.TILE_SIZE) * globals.TILE_SIZE;
    const centerY = Math.round(pos.y / globals.TILE_SIZE) * globals.TILE_SIZE;
    const radius = (topologyBrushRadius - 1) * globals.TILE_SIZE;

    setTerrainData((data) => {
      if (!data.Layr?.[1000]?.obj || !data.Atrb?.[1000]?.obj) return;
      const baseX = centerX - radius;
      const baseY = centerY - radius;
      const size = radius * 2;

      for (let i = 0; i <= size; i += globals.TILE_SIZE) {
        for (let j = 0; j <= size; j += globals.TILE_SIZE) {
          const tileX = baseX + i;
          const tileY = baseY + j;

          const tileGridX = Math.floor(tileX / globals.TILE_SIZE);
          const tileGridY = Math.floor(tileY / globals.TILE_SIZE);

          if (
            tileGridX < 0 ||
            tileGridX >= header.mapWidth ||
            tileGridY < 0 ||
            tileGridY >= header.mapHeight
          )
            continue;

          const flatPos = tileGridY * header.mapWidth + tileGridX;
          const atrbIdx = data.Layr[1000].obj[flatPos];
          if (atrbIdx === undefined) continue;
          const attr = data.Atrb[1000].obj[atrbIdx];
          if (!attr) continue;

          if (brushType === "add") {
            attr.flags |= 1; // TILE_ATTRIB_BLANK
          } else if (brushType === "remove") {
            attr.flags &= ~1; // Clear TILE_ATTRIB_BLANK
          }
        }
      }
    });
  };

  return (
    <Layer imageSmoothingEnabled={false}>
      {imgCanvas && header && (
        <Image
          x={0}
          y={0}
          width={header.mapWidth * globals.TILE_SIZE}
          height={header.mapHeight * globals.TILE_SIZE}
          image={imgCanvas}
          onClick={handleTileClickEvent}
        />
      )}
    </Layer>
  );
}

export function ElectricFloor0Tiles({
  headerData,
  setTerrainData,
  tileGrid,
}: {
  headerData: HeaderData;
  terrainData?: TerrainData;
  setTerrainData: Updater<TerrainData>;
  tileGrid: TileAttribute[];
}) {
  const globals = useAtomValue(Globals);
  // Use Jotai atoms for tile editing state
  const tileEditingEnabled = useAtomValue(TileEditingEnabled);
  const brushType = useAtomValue(TileBrushType);
  const topologyBrushRadius = useAtomValue(TopologyBrushRadius);

  const header = useMemo(() => headerData.Hedr[1000].obj, [headerData.Hedr]);

  const flagToColour = (flag: number) => {
    //Electric 1
    if (flag & (1 << 1)) return [255, 255, 255, 255];
    return [0, 0, 0, 0];
  };

  const coordColours = useMemo(() => {
    return tileGrid.flatMap((tile) => flagToColour(tile.flags));
  }, [tileGrid]);

  const imgCanvas = useMemo(() => {
    if (!header) return null;
    const result = createImageCanvas(
      header.mapWidth,
      header.mapHeight,
      coordColours,
    );
    if (!result.ok) {
      console.error("Failed to create image canvas:", result.error.message);
      return null;
    }
    return result.value;
  }, [header, coordColours]);

  const handleTileClickEvent = (e: KonvaEventObject<MouseEvent>) => {
    if (!tileEditingEnabled) return;

    const pos = e.target.getStage()?.getRelativePointerPosition();
    if (!pos) return;

    const centerX = Math.round(pos.x / globals.TILE_SIZE) * globals.TILE_SIZE;
    const centerY = Math.round(pos.y / globals.TILE_SIZE) * globals.TILE_SIZE;
    const radius = (topologyBrushRadius - 1) * globals.TILE_SIZE;

    setTerrainData((data) => {
      if (!data.Layr?.[1000]?.obj || !data.Atrb?.[1000]?.obj) return;
      const baseX = centerX - radius;
      const baseY = centerY - radius;
      const size = radius * 2;

      for (let i = 0; i <= size; i += globals.TILE_SIZE) {
        for (let j = 0; j <= size; j += globals.TILE_SIZE) {
          const tileX = baseX + i;
          const tileY = baseY + j;

          const tileGridX = Math.floor(tileX / globals.TILE_SIZE);
          const tileGridY = Math.floor(tileY / globals.TILE_SIZE);

          if (
            tileGridX < 0 ||
            tileGridX >= header.mapWidth ||
            tileGridY < 0 ||
            tileGridY >= header.mapHeight
          )
            continue;

          const flatPos = tileGridY * header.mapWidth + tileGridX;
          const atrbIdx = data.Layr[1000].obj[flatPos];
          if (atrbIdx === undefined) continue;
          const attr = data.Atrb[1000].obj[atrbIdx];
          if (!attr) continue;

          if (brushType === "add") {
            attr.flags |= 1 << 1; // TILE_ATTRIB_ELECTROCUTE_AREA0
          } else if (brushType === "remove") {
            attr.flags &= ~(1 << 1); // Clear TILE_ATTRIB_ELECTROCUTE_AREA0
          }
        }
      }
    });
  };

  return (
    <Layer imageSmoothingEnabled={false}>
      {imgCanvas && header && (
        <Image
          x={0}
          y={0}
          width={header.mapWidth * globals.TILE_SIZE}
          height={header.mapHeight * globals.TILE_SIZE}
          image={imgCanvas}
          onClick={handleTileClickEvent}
        />
      )}
    </Layer>
  );
}

export function ElectricFloor1Tiles({
  headerData,
  setTerrainData,
  tileGrid,
}: {
  headerData: HeaderData;
  setTerrainData: Updater<TerrainData>;
  tileGrid: TileAttribute[];
}) {
  const globals = useAtomValue(Globals);

  // Use Jotai atoms for tile editing state
  const tileEditingEnabled = useAtomValue(TileEditingEnabled);
  const brushType = useAtomValue(TileBrushType);
  const topologyBrushRadius = useAtomValue(TopologyBrushRadius);

  const header = useMemo(() => headerData.Hedr[1000].obj, [headerData.Hedr]);

  const flagToColour = (flag: number) => {
    //Electric 2
    if (flag & (1 << 2)) return [255, 255, 255, 255];
    return [0, 0, 0, 0];
  };

  const coordColours = useMemo(() => {
    return tileGrid.flatMap((tile) => flagToColour(tile.flags));
  }, [tileGrid]);

  const imgCanvas = useMemo(() => {
    if (!header) return null;
    const result = createImageCanvas(
      header.mapWidth,
      header.mapHeight,
      coordColours,
    );
    if (!result.ok) {
      console.error("Failed to create image canvas:", result.error.message);
      return null;
    }
    return result.value;
  }, [header, coordColours]);

  const handleTileClickEvent = (e: KonvaEventObject<MouseEvent>) => {
    if (!tileEditingEnabled) return;

    const pos = e.target.getStage()?.getRelativePointerPosition();
    if (!pos) return;

    const centerX = Math.round(pos.x / globals.TILE_SIZE) * globals.TILE_SIZE;
    const centerY = Math.round(pos.y / globals.TILE_SIZE) * globals.TILE_SIZE;
    const radius = (topologyBrushRadius - 1) * globals.TILE_SIZE;

    setTerrainData((data) => {
      if (!data.Layr?.[1000]?.obj || !data.Atrb?.[1000]?.obj) return;
      const baseX = centerX - radius;
      const baseY = centerY - radius;
      const size = radius * 2;

      for (let i = 0; i <= size; i += globals.TILE_SIZE) {
        for (let j = 0; j <= size; j += globals.TILE_SIZE) {
          const tileX = baseX + i;
          const tileY = baseY + j;

          const tileGridX = Math.floor(tileX / globals.TILE_SIZE);
          const tileGridY = Math.floor(tileY / globals.TILE_SIZE);

          if (
            tileGridX < 0 ||
            tileGridX >= header.mapWidth ||
            tileGridY < 0 ||
            tileGridY >= header.mapHeight
          )
            continue;

          const flatPos = tileGridY * header.mapWidth + tileGridX;
          const atrbIdx = data.Layr[1000].obj[flatPos];
          if (atrbIdx === undefined) continue;
          const attr = data.Atrb[1000].obj[atrbIdx];
          if (!attr) continue;

          if (brushType === "add") {
            attr.flags |= 1 << 2; // TILE_ATTRIB_ELECTROCUTE_AREA1
          } else if (brushType === "remove") {
            attr.flags &= ~(1 << 2); // Clear TILE_ATTRIB_ELECTROCUTE_AREA1
          }
        }
      }
    });
  };

  return (
    <Layer imageSmoothingEnabled={false}>
      {imgCanvas && header && (
        <Image
          x={0}
          y={0}
          width={header.mapWidth * globals.TILE_SIZE}
          height={header.mapHeight * globals.TILE_SIZE}
          image={imgCanvas}
          onClick={handleTileClickEvent}
        />
      )}
    </Layer>
  );
}
