import { TileAttribute } from "@/python/structSpecs/LevelTypes";
import {
<<<<<<< HEAD
  TerrainData,
  HeaderData,
} from "@/python/structSpecs/LevelTypes";
=======
  ottoMaticLevel,
  ottoTileAttribute,
} from "../../python/structSpecs/ottoMaticInterface";
>>>>>>> origin/main
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
<<<<<<< HEAD
import { createImageCanvas } from "./tiles/tilesUtils";
import { elevationToRGBA } from "./tiles/tilesUtils";
import { KonvaEventObject } from "konva/lib/Node";
import { calculateBrushPixels, applyTopologyBrush, PixelType } from "../utils/topologyBrushUtils";
=======
import { handleTileClick } from "../../data/tiles/tileHandlers";
import { KonvaEventObject } from 'konva/lib/Node';
>>>>>>> origin/main

/* 

  Tile attribs p0 and p1 are NOT used!

	TILE_ATTRIB_BLANK				=	1, 
	TILE_ATTRIB_ELECTROCUTE_AREA0	=	(1<<1),
	TILE_ATTRIB_ELECTROCUTE_AREA1	=	(1<<2)

*/

export function Tiles({
  data,
  setData,
  isEditingTopology,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  isEditingTopology: boolean;
}) {
  const tileViewMode = useAtomValue(TileViewMode);

<<<<<<< HEAD
  // Check data structure to determine tile type rather than game type
  // Games with individual tiles have Layr containing tile indices but no Atrb tile attributes
  // Standard games have Atrb with tile flags
  // NOTE: These variables are intentionally unused but kept for documentation
  // const hasAtrbData = Boolean(terrainData.Atrb?.[1000]?.obj?.length);
  // const hasLayrData = Boolean(terrainData.Layr?.[1000]?.obj);
=======
  const tileGrid = useMemo(
    () => data.Layr[1000].obj.map((atrbIdx) => data.Atrb[1000].obj[atrbIdx]),
    [data.Layr, data.Atrb],
  );
>>>>>>> origin/main

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
        data={data}
        setData={setData}
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
<<<<<<< HEAD
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
=======
    return <EmptyTiles data={data} setData={setData} tileGrid={tileGrid} />;
  if (tileViewMode === TileViews.ElectricFloor0)
    return (
      <ElectricFloor0Tiles data={data} setData={setData} tileGrid={tileGrid} />
>>>>>>> origin/main
    );

  //ElectricFloor1

  return (
<<<<<<< HEAD
    <ElectricFloor1Tiles
      headerData={headerData}
      setTerrainData={setTerrainData}
      tileGrid={tileGrid}
    />
=======
    <ElectricFloor1Tiles data={data} setData={setData} tileGrid={tileGrid} />
>>>>>>> origin/main
  );
}

export function TopologyTiles({
  data,
  setData,
  isEditingTopology,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  isEditingTopology: boolean;
}) {
  const currentTopologyBrushMode = useAtomValue(CurrentTopologyBrushMode);
  const currentTopologyValueMode = useAtomValue(CurrentTopologyValueMode);
  const topologyValue = useAtomValue(TopologyValue);
  const topologyBrushRadius = useAtomValue(TopologyBrushRadius);
  const globals = useAtomValue(Globals);
  const opacity = useAtomValue(TopologyOpacity);

  const header = useMemo(() => data.Hedr[1000].obj, [data.Hedr]);

  // Guard against missing or empty YCrd data
  const yCrdData = terrainData.YCrd?.[1000]?.obj;

  // Use pure helper functions from tilesUtils to avoid recreating closures

<<<<<<< HEAD
  const coordColours = useMemo(() => {
    if (!yCrdData || yCrdData.length === 0) {
      // Return a minimal valid array for empty data
      return [128, 128, 128, 255];
    }
    return yCrdData.flatMap((e) => elevationToRGBA(header, e));
  }, [yCrdData, header]);
=======
  const coordColours = useMemo(
    () => data.YCrd[1000].obj.flatMap(elevationToRGBA),
    [data.YCrd[1000].obj],
  );
>>>>>>> origin/main

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
<<<<<<< HEAD
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
=======
    return imgCanvas;
  }, [header, data.YCrd[1000].obj]);

  const setPixels = (pixelList: PixelType[]) => {
    setData((data) => {
      for (const pixelData of pixelList) {
        const { x, y, value, distance } = pixelData;
>>>>>>> origin/main

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

<<<<<<< HEAD
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
=======
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
>>>>>>> origin/main

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
    </Layer>
  );
}
export function EmptyTiles({
<<<<<<< HEAD
  headerData,
  setTerrainData,
  tileGrid,
}: {
  headerData: HeaderData;
  setTerrainData: Updater<TerrainData>;
  tileGrid: TileAttribute[];
=======
  data,
  setData,
  tileGrid,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  tileGrid: ottoTileAttribute[];
>>>>>>> origin/main
}) {
  const globals = useAtomValue(Globals);
  // Use Jotai atoms for tile editing state
  const tileEditingEnabled = useAtomValue(TileEditingEnabled);
  const brushType = useAtomValue(TileBrushType);
  const topologyBrushRadius = useAtomValue(TopologyBrushRadius);

  const header = useMemo(() => data.Hedr[1000].obj, [data.Hedr]);

  const flagToColour = (flag: number) => {
    //TILE_ATTRB_BLANK
    if (flag & 1) return [255, 255, 255, 255];
    return [0, 0, 0, 0];
  };

  const coordColours = useMemo(() => {
    return tileGrid.flatMap((tile) => flagToColour(tile.flags));
  }, [tileGrid]);

  const imgCanvas = useMemo(() => {
<<<<<<< HEAD
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
=======
    const imgCanvas = document.createElement("canvas");
    imgCanvas.width = header.mapWidth;
    imgCanvas.height = header.mapHeight;
    const imgCtx = imgCanvas.getContext("2d");
    if (!imgCtx) throw new Error("Could not get canvas context");

    imgCtx.putImageData(
      new ImageData(
        new Uint8ClampedArray(coordColours),
        header.mapWidth,
        header.mapHeight,
      ),
      0,
      0,
    );
    return imgCanvas;
  }, [header.mapWidth, header.mapHeight, coordColours]);
>>>>>>> origin/main

  const handleTileClickEvent = (e: KonvaEventObject<MouseEvent>) => {
    if (!tileEditingEnabled) return;

    const pos = e.target.getStage()?.getRelativePointerPosition();
    if (!pos) return;

<<<<<<< HEAD
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
=======
    // Call our handler function with brush radius
    handleTileClick(
      pos.x,
      pos.y,
      setData,
      currentTileView,
      tileEditingEnabled,
      brushType,
      globals.TILE_SIZE,
      topologyBrushRadius,
    );
>>>>>>> origin/main
  };

  return (
    <Layer imageSmoothingEnabled={false}>
      <Image
        x={0}
        y={0}
        width={header.mapWidth * globals.TILE_SIZE}
        height={header.mapHeight * globals.TILE_SIZE}
        image={imgCanvas}
        onClick={handleTileClickEvent}
      />
    </Layer>
  );
}
export function ElectricFloor0Tiles({
<<<<<<< HEAD
  headerData,
  setTerrainData,
  tileGrid,
}: {
  headerData: HeaderData;
  terrainData?: TerrainData;
  setTerrainData: Updater<TerrainData>;
  tileGrid: TileAttribute[];
=======
  data,
  setData,
  tileGrid,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  tileGrid: ottoTileAttribute[];
>>>>>>> origin/main
}) {
  const globals = useAtomValue(Globals);
  // Use Jotai atoms for tile editing state
  const tileEditingEnabled = useAtomValue(TileEditingEnabled);
  const brushType = useAtomValue(TileBrushType);
  const topologyBrushRadius = useAtomValue(TopologyBrushRadius);

  const header = useMemo(() => data.Hedr[1000].obj, [data.Hedr]);

  const flagToColour = (flag: number) => {
    //Electric 1
    if (flag & (1 << 1)) return [255, 255, 255, 255];
    return [0, 0, 0, 0];
  };

  const coordColours = useMemo(() => {
    return tileGrid.flatMap((tile) => flagToColour(tile.flags));
  }, [tileGrid]);

  const imgCanvas = useMemo(() => {
<<<<<<< HEAD
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
=======
    const imgCanvas = document.createElement("canvas");
    imgCanvas.width = header.mapWidth;
    imgCanvas.height = header.mapHeight;
    const imgCtx = imgCanvas.getContext("2d");
    if (!imgCtx) throw new Error("Could not get canvas context");

    imgCtx.putImageData(
      new ImageData(
        new Uint8ClampedArray(coordColours),
        header.mapWidth,
        header.mapHeight,
      ),
      0,
      0,
    );
    return imgCanvas;
  }, [header.mapWidth, header.mapHeight, coordColours]);
>>>>>>> origin/main

  const handleTileClickEvent = (e: KonvaEventObject<MouseEvent>) => {
    if (!tileEditingEnabled) return;

    const pos = e.target.getStage()?.getRelativePointerPosition();
    if (!pos) return;

<<<<<<< HEAD
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
=======
    // Call our handler function with brush radius
    handleTileClick(
      pos.x,
      pos.y,
      setData,
      currentTileView,
      tileEditingEnabled,
      brushType,
      globals.TILE_SIZE,
      topologyBrushRadius,
    );
>>>>>>> origin/main
  };

  return (
    <Layer imageSmoothingEnabled={false}>
      <Image
        x={0}
        y={0}
        width={header.mapWidth * globals.TILE_SIZE}
        height={header.mapHeight * globals.TILE_SIZE}
        image={imgCanvas}
        onClick={handleTileClickEvent}
      />
    </Layer>
  );
}
export function ElectricFloor1Tiles({
<<<<<<< HEAD
  headerData,
  setTerrainData,
  tileGrid,
}: {
  headerData: HeaderData;
  setTerrainData: Updater<TerrainData>;
  tileGrid: TileAttribute[];
=======
  data,
  setData,
  tileGrid,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  tileGrid: ottoTileAttribute[];
>>>>>>> origin/main
}) {
  const globals = useAtomValue(Globals);

  // Use Jotai atoms for tile editing state
  const tileEditingEnabled = useAtomValue(TileEditingEnabled);
  const brushType = useAtomValue(TileBrushType);
  const topologyBrushRadius = useAtomValue(TopologyBrushRadius);

  const header = useMemo(() => data.Hedr[1000].obj, [data.Hedr]);

  const flagToColour = (flag: number) => {
    //Electric 2
    if (flag & (1 << 2)) return [255, 255, 255, 255];
    return [0, 0, 0, 0];
  };

  const coordColours = useMemo(() => {
    return tileGrid.flatMap((tile) => flagToColour(tile.flags));
  }, [tileGrid]);

  const imgCanvas = useMemo(() => {
<<<<<<< HEAD
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
=======
    const imgCanvas = document.createElement("canvas");
    imgCanvas.width = header.mapWidth;
    imgCanvas.height = header.mapHeight;
    const imgCtx = imgCanvas.getContext("2d");
    if (!imgCtx) throw new Error("Could not get canvas context");

    imgCtx.putImageData(
      new ImageData(
        new Uint8ClampedArray(coordColours),
        header.mapWidth,
        header.mapHeight,
      ),
      0,
      0,
    );
    return imgCanvas;
  }, [header.mapWidth, header.mapHeight, coordColours]);
>>>>>>> origin/main

  const handleTileClickEvent = (e: KonvaEventObject<MouseEvent>) => {
    if (!tileEditingEnabled) return;

    const pos = e.target.getStage()?.getRelativePointerPosition();
    if (!pos) return;

<<<<<<< HEAD
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
=======
    // Call our handler function with brush radius
    handleTileClick(
      pos.x,
      pos.y,
      setData,
      currentTileView,
      tileEditingEnabled,
      brushType,
      globals.TILE_SIZE,
      topologyBrushRadius,
    );
>>>>>>> origin/main
  };

  return (
    <Layer imageSmoothingEnabled={false}>
      <Image
        x={0}
        y={0}
        width={header.mapWidth * globals.TILE_SIZE}
        height={header.mapHeight * globals.TILE_SIZE}
        image={imgCanvas}
        onClick={handleTileClickEvent}
      />
    </Layer>
  );
}
