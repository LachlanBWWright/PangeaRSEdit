import {
  ottoMaticLevel,
  ottoTileAttribute,
} from "../../python/structSpecs/ottoMaticInterface";
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
import { Globals } from "../../data/globals/globals";
import { useMemo } from "react";
import { handleTileClick } from "../../data/tiles/tileHandlers";

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

  const tileGrid = useMemo(
    () => data.Layr[1000].obj.map((atrbIdx) => data.Atrb[1000].obj[atrbIdx]),
    [data.Layr, data.Atrb],
  );

  if (tileViewMode === TileViews.Topology)
    return (
      <TopologyTiles
        data={data}
        setData={setData}
        isEditingTopology={isEditingTopology}
      />
    );

  if (tileViewMode === TileViews.Flags)
    return <EmptyTiles data={data} setData={setData} tileGrid={tileGrid} />;
  if (tileViewMode === TileViews.ElectricFloor0)
    return (
      <ElectricFloor0Tiles data={data} setData={setData} tileGrid={tileGrid} />
    );

  //ElectricFloor1

  return (
    <ElectricFloor1Tiles data={data} setData={setData} tileGrid={tileGrid} />
  );
}

type PixelType = { x: number; y: number; value: number; distance: number };

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

  const elevationToRGBA = (elevation: number) => {
    return [
      ((elevation - header.minY) / (header.maxY - header.minY)) * 255,
      ((elevation - header.minY) / (header.maxY - header.minY)) * 255,
      ((elevation - header.minY) / (header.maxY - header.minY)) * 255,
      255,
    ];
  };

  const flattenCoords = (x: number, y: number) => {
    x = Math.floor(x / globals.TILE_SIZE);
    y = Math.floor(y / globals.TILE_SIZE);
    return y * (header.mapWidth + 1) + x;
  };

  const coordColours = useMemo(
    () => data.YCrd[1000].obj.flatMap(elevationToRGBA),
    [data.YCrd[1000].obj],
  );

  const imgCanvas = useMemo(() => {
    const imgCanvas = document.createElement("canvas");
    imgCanvas.width = header.mapWidth + 1;
    imgCanvas.height = header.mapHeight + 1;
    const imgCtx = imgCanvas.getContext("2d");
    if (!imgCtx) throw new Error("Could not get canvas context");

    imgCtx.putImageData(
      new ImageData(
        new Uint8ClampedArray(coordColours),
        header.mapWidth + 1,
        header.mapHeight + 1,
      ),
      0,
      0,
    );
    return imgCanvas;
  }, [header, data.YCrd[1000].obj]);

  const setPixels = (pixelList: PixelType[]) => {
    setData((data) => {
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
    </Layer>
  );
}
export function EmptyTiles({
  data,
  setData,
  tileGrid,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  tileGrid: ottoTileAttribute[];
}) {
  const globals = useAtomValue(Globals);
  // Use Jotai atoms for tile editing state
  const tileEditingEnabled = useAtomValue(TileEditingEnabled);
  const brushType = useAtomValue(TileBrushType);
  const currentTileView = useAtomValue(TileViewMode);
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

  const handleTileClickEvent = (e: any) => {
    if (!tileEditingEnabled) return;

    const pos = e.target.getStage()?.getRelativePointerPosition();
    if (!pos) return;

    // Call our handler function with brush radius
    handleTileClick(
      pos.x,
      pos.y,
      data,
      setData,
      currentTileView,
      tileEditingEnabled,
      brushType,
      globals.TILE_SIZE,
      topologyBrushRadius,
    );
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
  data,
  setData,
  tileGrid,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  tileGrid: ottoTileAttribute[];
}) {
  const globals = useAtomValue(Globals);
  // Use Jotai atoms for tile editing state
  const tileEditingEnabled = useAtomValue(TileEditingEnabled);
  const brushType = useAtomValue(TileBrushType);
  const currentTileView = useAtomValue(TileViewMode);
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

  const handleTileClickEvent = (e: any) => {
    if (!tileEditingEnabled) return;

    const pos = e.target.getStage()?.getRelativePointerPosition();
    if (!pos) return;

    // Call our handler function with brush radius
    handleTileClick(
      pos.x,
      pos.y,
      data,
      setData,
      currentTileView,
      tileEditingEnabled,
      brushType,
      globals.TILE_SIZE,
      topologyBrushRadius,
    );
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
  data,
  setData,
  tileGrid,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  tileGrid: ottoTileAttribute[];
}) {
  const globals = useAtomValue(Globals);
  // Use Jotai atoms for tile editing state
  const tileEditingEnabled = useAtomValue(TileEditingEnabled);
  const brushType = useAtomValue(TileBrushType);
  const currentTileView = useAtomValue(TileViewMode);
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

  const handleTileClickEvent = (e: any) => {
    if (!tileEditingEnabled) return;

    const pos = e.target.getStage()?.getRelativePointerPosition();
    if (!pos) return;

    // Call our handler function with brush radius
    handleTileClick(
      pos.x,
      pos.y,
      data,
      setData,
      currentTileView,
      tileEditingEnabled,
      brushType,
      globals.TILE_SIZE,
      topologyBrushRadius,
    );
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
