import { ottoTileAttribute } from "../../python/structSpecs/ottoMaticInterface";
import {
  TerrainData,
  HeaderData,
} from "../../python/structSpecs/ottoMaticLevelData";
import { Layer, Image } from "react-konva";
import { Updater } from "use-immer";
import {
  CurrentTopologyBrushMode,
  CurrentTopologyValueMode,
  TileViewMode,
  TileViews,
  TopologyBrushMode,
  TopologyBrushRadius,
  TopologyOpacity,
  TopologyValue,
  TopologyValueMode,
  TileEditingEnabled,
  TileBrushType,
} from "../../data/tiles/tileAtoms";
import { useAtomValue } from "jotai";
import { Game, Globals } from "../../data/globals/globals";
import { useMemo } from "react";
import { createImageCanvas } from "./tiles/tilesUtils";
import { KonvaEventObject } from "konva/lib/Node";

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
  const globals = useAtomValue(Globals);

  // For games that use individual tiles (Bugdom, Nanosaur), Layr contains tile indices
  // not Atrb references. Return null for tile views that don't apply.
  const usesIndividualTiles =
    globals.GAME_TYPE === Game.BUGDOM || globals.GAME_TYPE === Game.NANOSAUR;

  const tileGrid = useMemo(() => {
    // For individual tile games, Layr doesn't reference Atrb, so return empty array
    if (
      usesIndividualTiles ||
      !terrainData.Atrb?.[1000]?.obj?.length ||
      !terrainData.Layr?.[1000]?.obj
    ) {
      return [];
    }
    return terrainData.Layr[1000].obj
      .map((atrbIdx: number) => terrainData.Atrb[1000].obj[atrbIdx])
      .filter((tile): tile is ottoTileAttribute => tile !== undefined);
  }, [terrainData.Layr, terrainData.Atrb, usesIndividualTiles]);

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
        terrainData={terrainData}
        setTerrainData={setTerrainData}
        tileGrid={tileGrid}
      />
    );
  if (tileViewMode === TileViews.ElectricFloor0)
    return (
      <ElectricFloor0Tiles
        headerData={headerData}
        terrainData={terrainData}
        setTerrainData={setTerrainData}
        tileGrid={tileGrid}
      />
    );

  //ElectricFloor1

  return (
    <ElectricFloor1Tiles
      headerData={headerData}
      terrainData={terrainData}
      setTerrainData={setTerrainData}
      tileGrid={tileGrid}
    />
  );
}

type PixelType = { x: number; y: number; value: number; distance: number };

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

  const elevationToRGBA = (elevation: number) => {
    // Avoid division by zero
    const range = header.maxY - header.minY;
    if (range === 0) return [128, 128, 128, 255];
    return [
      ((elevation - header.minY) / range) * 255,
      ((elevation - header.minY) / range) * 255,
      ((elevation - header.minY) / range) * 255,
      255,
    ];
  };
  const flattenCoords = (x: number, y: number) => {
    x = Math.floor(x / globals.TILE_SIZE);

    y = Math.floor(y / globals.TILE_SIZE);
    return y * (header.mapWidth + 1) + x;
  };

  const coordColours = useMemo(() => {
    if (!yCrdData || yCrdData.length === 0) {
      // Return a minimal valid array for empty data
      return [128, 128, 128, 255];
    }
    return yCrdData.flatMap(elevationToRGBA);
  }, [yCrdData, header]);

  const imgCanvas = useMemo(() => {
    // Guard against empty data - create a 1x1 placeholder
    if (!yCrdData || yCrdData.length === 0) {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      return canvas;
    }
    return createImageCanvas(
      header.mapWidth + 1,
      header.mapHeight + 1,
      coordColours,
    );
  }, [header, yCrdData, coordColours]);

  const setPixels = (pixelList: PixelType[]) => {
    // Guard against missing YCrd data
    if (!yCrdData || yCrdData.length === 0) return;

    setTerrainData((data) => {
      if (!data.YCrd?.[1000]?.obj) return;

      for (const pixelData of pixelList) {
        const { x, y, value, distance } = pixelData;

        if (
          x < 0 ||
          x > (header.mapWidth + 1) * globals.TILE_SIZE ||
          y < 0 ||
          y > (header.mapHeight + 1) * globals.TILE_SIZE
        )
          continue;
        const flatPos = flattenCoords(x, y);
        if (data.YCrd[1000].obj[flatPos] === undefined) continue;

        if (currentTopologyValueMode === TopologyValueMode.SET_VALUE) {
          data.YCrd[1000].obj[flatPos] = value;
        } else if (currentTopologyValueMode === TopologyValueMode.DELTA_VALUE) {
          data.YCrd[1000].obj[flatPos] = data.YCrd[1000].obj[flatPos] + value;
        } else if (
          currentTopologyValueMode === TopologyValueMode.DELTA_WITH_DROPOFF
        ) {
          data.YCrd[1000].obj[flatPos] =
            data.YCrd[1000].obj[flatPos] + value * (1 - distance);
        }

        //Clamp
        if (data.YCrd[1000].obj[flatPos] < header.minY) {
          data.YCrd[1000].obj[flatPos] = header.minY;
        }
        if (data.YCrd[1000].obj[flatPos] > header.maxY) {
          data.YCrd[1000].obj[flatPos] = header.maxY;
        }
      }
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
            const pixelList: PixelType[] = [];

            if (currentTopologyBrushMode === TopologyBrushMode.CIRCLE_BRUSH) {
              // Create a circular brush pattern
              const baseX = centerX - radius;
              const baseY = centerY - radius;
              const diameter = radius * 2;

              for (let i = 0; i <= diameter; i += globals.TILE_SIZE) {
                for (let j = 0; j <= diameter; j += globals.TILE_SIZE) {
                  const tileX = baseX + i;
                  const tileY = baseY + j;

                  // Calculate if this tile is within the circle radius
                  const distanceSquared =
                    Math.pow(tileX - centerX, 2) + Math.pow(tileY - centerY, 2);

                  const distance = Math.sqrt(distanceSquared) / radius;

                  if (distanceSquared <= Math.pow(radius, 2)) {
                    pixelList.push({
                      x: tileX,
                      y: tileY,
                      value: topologyValue,
                      distance: distance,
                    });
                  }
                }
              }
            } else {
              // Original square brush pattern
              const baseX = centerX - radius;
              const baseY = centerY - radius;
              const size = radius * 2;

              // Calculate distance for square brush (normalized from 0 to 1)
              // Using Manhattan distance for square pattern feel
              for (let i = 0; i <= size; i += globals.TILE_SIZE) {
                for (let j = 0; j <= size; j += globals.TILE_SIZE) {
                  const tileX = baseX + i;
                  const tileY = baseY + j;

                  // Calculate distance from center (using max of x,y distance for square pattern feel)
                  const xDistance = Math.abs(tileX - centerX);
                  const yDistance = Math.abs(tileY - centerY);
                  const distance = Math.max(xDistance, yDistance) / radius;

                  pixelList.push({
                    x: tileX,
                    y: tileY,
                    value: topologyValue,
                    distance: distance,
                  });
                }
              }
            }

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
  terrainData: _terrainData,
  setTerrainData,
  tileGrid,
}: {
  headerData: HeaderData;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  tileGrid: ottoTileAttribute[];
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
    return createImageCanvas(header.mapWidth, header.mapHeight, coordColours);
  }, [header?.mapWidth, header?.mapHeight, coordColours]);

  const handleTileClickEvent = (e: KonvaEventObject<MouseEvent>) => {
    if (!tileEditingEnabled) return;

    const pos = e.target.getStage()?.getRelativePointerPosition();
    if (!pos) return;

    const centerX = Math.round(pos.x / globals.TILE_SIZE) * globals.TILE_SIZE;
    const centerY = Math.round(pos.y / globals.TILE_SIZE) * globals.TILE_SIZE;
    const radius = (topologyBrushRadius - 1) * globals.TILE_SIZE;

    setTerrainData((data) => {
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
  terrainData: _terrainData,
  setTerrainData,
  tileGrid,
}: {
  headerData: HeaderData;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  tileGrid: ottoTileAttribute[];
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
    return createImageCanvas(header.mapWidth, header.mapHeight, coordColours);
  }, [header?.mapWidth, header?.mapHeight, coordColours]);

  const handleTileClickEvent = (e: KonvaEventObject<MouseEvent>) => {
    if (!tileEditingEnabled) return;

    const pos = e.target.getStage()?.getRelativePointerPosition();
    if (!pos) return;

    const centerX = Math.round(pos.x / globals.TILE_SIZE) * globals.TILE_SIZE;
    const centerY = Math.round(pos.y / globals.TILE_SIZE) * globals.TILE_SIZE;
    const radius = (topologyBrushRadius - 1) * globals.TILE_SIZE;

    setTerrainData((data) => {
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
  terrainData: _terrainData,
  setTerrainData,
  tileGrid,
}: {
  headerData: HeaderData;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  tileGrid: ottoTileAttribute[];
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
    return createImageCanvas(header.mapWidth, header.mapHeight, coordColours);
  }, [header?.mapWidth, header?.mapHeight, coordColours]);

  const handleTileClickEvent = (e: KonvaEventObject<MouseEvent>) => {
    if (!tileEditingEnabled) return;

    const pos = e.target.getStage()?.getRelativePointerPosition();
    if (!pos) return;

    const centerX = Math.round(pos.x / globals.TILE_SIZE) * globals.TILE_SIZE;
    const centerY = Math.round(pos.y / globals.TILE_SIZE) * globals.TILE_SIZE;
    const radius = (topologyBrushRadius - 1) * globals.TILE_SIZE;

    setTerrainData((data) => {
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
