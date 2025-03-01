import {
  ottoMaticLevel,
  ottoTileAttribute,
} from "../../python/structSpecs/ottoMaticInterface";
import { Layer, Image } from "react-konva";
import { Updater } from "use-immer";
import {
  //CurrentTopologyBrushMode,
  CurrentTopologyValueMode,
  TileViewMode,
  TileViews,
  TopologyBrushRadius,
  TopologyOpacity,
  TopologyValue,
  TopologyValueMode,
} from "../../data/tiles/tileAtoms";
import { useAtomValue } from "jotai";
import { Globals } from "../../data/globals/globals";
import { useMemo } from "react";

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

    [],
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
    return (
      <EmptyTiles
        data={data}
        setData={setData}
        isEditingTopology={isEditingTopology}
        tileGrid={tileGrid}
      />
    );
  if (tileViewMode === TileViews.ElectricFloor0)
    return (
      <ElectricFloor0Tiles
        data={data}
        setData={setData}
        isEditingTopology={isEditingTopology}
        tileGrid={tileGrid}
      />
    );

  //ElectricFloor1

  return (
    <ElectricFloor1Tiles
      data={data}
      setData={setData}
      isEditingTopology={isEditingTopology}
      tileGrid={tileGrid}
    />
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
  //const currentTopologyBrushMode = useAtomValue(CurrentTopologyBrushMode);
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

  const setPixel = (x: number, y: number, value: number) => {
    if (
      x < 0 ||
      x > (header.mapWidth + 1) * globals.TILE_SIZE ||
      y < 0 ||
      y > (header.mapHeight + 1) * globals.TILE_SIZE
    )
      return;
    const flatPos = flattenCoords(x, y);
    setData((data) => {
      if (data.YCrd[1000].obj[flatPos] === undefined) return;

      if (currentTopologyValueMode === TopologyValueMode.SET_VALUE) {
        data.YCrd[1000].obj[flatPos] = value;
      } else if (currentTopologyValueMode === TopologyValueMode.DELTA_VALUE) {
        data.YCrd[1000].obj[flatPos] = data.YCrd[1000].obj[flatPos] + value;
      }

      //Clamp
      if (data.YCrd[1000].obj[flatPos] < header.minY) {
        data.YCrd[1000].obj[flatPos] = header.minY;
      }
      if (data.YCrd[1000].obj[flatPos] > header.maxY) {
        data.YCrd[1000].obj[flatPos] = header.maxY;
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
          //e.evt.
          if (!isEditingTopology) return;
          const pos = e.target.getStage()?.getRelativePointerPosition();
          if (!pos) return;

          const baseX =
            Math.round(pos.x) - (topologyBrushRadius - 1) * globals.TILE_SIZE;
          const baseY =
            Math.round(pos.y) - (topologyBrushRadius - 1) * globals.TILE_SIZE;

          for (let i = 0; i < (topologyBrushRadius - 1) * 2 + 1; i++) {
            for (let j = 0; j < (topologyBrushRadius - 1) * 2 + 1; j++) {
              setPixel(
                baseX + i * globals.TILE_SIZE,
                baseY + j * globals.TILE_SIZE,
                topologyValue,
              );
            }
          }
        }}
        image={imgCanvas}
      />
    </Layer>
  );
}
export function EmptyTiles({
  data,
  setData,
  isEditingTopology,
  tileGrid,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  isEditingTopology: boolean;
  tileGrid: ottoTileAttribute[];
}) {
  //const currentTopologyBrushMode = useAtomValue(CurrentTopologyBrushMode);
  const currentTopologyValueMode = useAtomValue(CurrentTopologyValueMode);
  const topologyValue = useAtomValue(TopologyValue);
  const topologyBrushRadius = useAtomValue(TopologyBrushRadius);
  const globals = useAtomValue(Globals);

  const header = useMemo(() => data.Hedr[1000].obj, [data.Hedr]);

  const flattenCoords = (x: number, y: number) => {
    x = Math.floor(x / globals.TILE_SIZE);
    y = Math.floor(y / globals.TILE_SIZE);
    return y * (header.mapWidth + 1) + x;
  };

  const flagToColour = (flag: number) => {
    //TILE_ATTRB_BLANK
    if (flag & 1) return [255, 255, 255, 255];
    return [0, 0, 0, 0];
  };

  const coordColours = useMemo(
    () => {
      return tileGrid.flatMap((tile) => flagToColour(tile.flags));
    }, //data.YCrd[1000].obj.flatMap(elevationToRGBA),
    [data.Atrb[1000].obj, globals, header],
  );

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
  }, [header, data.YCrd[1000].obj]);

  const setPixel = (x: number, y: number, value: number) => {
    if (
      x < 0 ||
      x > (header.mapWidth + 1) * globals.TILE_SIZE ||
      y < 0 ||
      y > (header.mapHeight + 1) * globals.TILE_SIZE
    )
      return;
    const flatPos = flattenCoords(x, y);
    setData((data) => {
      if (data.YCrd[1000].obj[flatPos] === undefined) return;

      if (currentTopologyValueMode === TopologyValueMode.SET_VALUE) {
        data.YCrd[1000].obj[flatPos] = value;
      } else if (currentTopologyValueMode === TopologyValueMode.DELTA_VALUE) {
        data.YCrd[1000].obj[flatPos] = data.YCrd[1000].obj[flatPos] + value;
      }

      //Clamp
      if (data.YCrd[1000].obj[flatPos] < header.minY) {
        data.YCrd[1000].obj[flatPos] = header.minY;
      }
      if (data.YCrd[1000].obj[flatPos] > header.maxY) {
        data.YCrd[1000].obj[flatPos] = header.maxY;
      }
    });
  };

  return (
    <Layer imageSmoothingEnabled={false}>
      <Image
        x={0}
        y={0}
        width={header.mapWidth * globals.TILE_SIZE}
        height={header.mapHeight * globals.TILE_SIZE}
        onClick={(e) => {
          //e.evt.
          if (!isEditingTopology) return;
          const pos = e.target.getStage()?.getRelativePointerPosition();
          if (!pos) return;

          const baseX =
            Math.round(pos.x) - (topologyBrushRadius - 1) * globals.TILE_SIZE;
          const baseY =
            Math.round(pos.y) - (topologyBrushRadius - 1) * globals.TILE_SIZE;

          for (let i = 0; i < (topologyBrushRadius - 1) * 2 + 1; i++) {
            for (let j = 0; j < (topologyBrushRadius - 1) * 2 + 1; j++) {
              setPixel(
                baseX + i * globals.TILE_SIZE,
                baseY + j * globals.TILE_SIZE,
                topologyValue,
              );
            }
          }
        }}
        image={imgCanvas}
      />
    </Layer>
  );
}
export function ElectricFloor0Tiles({
  data,
  setData,
  isEditingTopology,
  tileGrid,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  isEditingTopology: boolean;
  tileGrid: ottoTileAttribute[];
}) {
  //const currentTopologyBrushMode = useAtomValue(CurrentTopologyBrushMode);
  const currentTopologyValueMode = useAtomValue(CurrentTopologyValueMode);
  const topologyValue = useAtomValue(TopologyValue);
  const topologyBrushRadius = useAtomValue(TopologyBrushRadius);
  const globals = useAtomValue(Globals);

  const header = useMemo(() => data.Hedr[1000].obj, [data.Hedr]);

  const flattenCoords = (x: number, y: number) => {
    x = Math.floor(x / globals.TILE_SIZE);
    y = Math.floor(y / globals.TILE_SIZE);
    return y * (header.mapWidth + 1) + x;
  };

  const flagToColour = (flag: number) => {
    //Electric 1
    if (flag & (1 << 1)) return [255, 255, 255, 255];
    return [0, 0, 0, 0];
  };

  const coordColours = useMemo(
    () => {
      return tileGrid.flatMap((tile) => flagToColour(tile.flags));
    }, //data.YCrd[1000].obj.flatMap(elevationToRGBA),
    [data.Atrb[1000].obj, globals, header],
  );

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
  }, [header, data.YCrd[1000].obj]);

  const setPixel = (x: number, y: number, value: number) => {
    if (
      x < 0 ||
      x > (header.mapWidth + 1) * globals.TILE_SIZE ||
      y < 0 ||
      y > (header.mapHeight + 1) * globals.TILE_SIZE
    )
      return;
    const flatPos = flattenCoords(x, y);
    setData((data) => {
      if (data.YCrd[1000].obj[flatPos] === undefined) return;

      if (currentTopologyValueMode === TopologyValueMode.SET_VALUE) {
        data.YCrd[1000].obj[flatPos] = value;
      } else if (currentTopologyValueMode === TopologyValueMode.DELTA_VALUE) {
        data.YCrd[1000].obj[flatPos] = data.YCrd[1000].obj[flatPos] + value;
      }

      //Clamp
      if (data.YCrd[1000].obj[flatPos] < header.minY) {
        data.YCrd[1000].obj[flatPos] = header.minY;
      }
      if (data.YCrd[1000].obj[flatPos] > header.maxY) {
        data.YCrd[1000].obj[flatPos] = header.maxY;
      }
    });
  };

  return (
    <Layer imageSmoothingEnabled={false}>
      <Image
        x={0}
        y={0}
        width={header.mapWidth * globals.TILE_SIZE}
        height={header.mapHeight * globals.TILE_SIZE}
        onClick={(e) => {
          //e.evt.
          if (!isEditingTopology) return;
          const pos = e.target.getStage()?.getRelativePointerPosition();
          if (!pos) return;

          const baseX =
            Math.round(pos.x) - (topologyBrushRadius - 1) * globals.TILE_SIZE;
          const baseY =
            Math.round(pos.y) - (topologyBrushRadius - 1) * globals.TILE_SIZE;

          for (let i = 0; i < (topologyBrushRadius - 1) * 2 + 1; i++) {
            for (let j = 0; j < (topologyBrushRadius - 1) * 2 + 1; j++) {
              setPixel(
                baseX + i * globals.TILE_SIZE,
                baseY + j * globals.TILE_SIZE,
                topologyValue,
              );
            }
          }
        }}
        image={imgCanvas}
      />
    </Layer>
  );
}
export function ElectricFloor1Tiles({
  data,
  setData,
  isEditingTopology,
  tileGrid,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  isEditingTopology: boolean;
  tileGrid: ottoTileAttribute[];
}) {
  //const currentTopologyBrushMode = useAtomValue(CurrentTopologyBrushMode);
  const currentTopologyValueMode = useAtomValue(CurrentTopologyValueMode);
  const topologyValue = useAtomValue(TopologyValue);
  const topologyBrushRadius = useAtomValue(TopologyBrushRadius);
  const globals = useAtomValue(Globals);

  const header = useMemo(() => data.Hedr[1000].obj, [data.Hedr]);

  const flattenCoords = (x: number, y: number) => {
    x = Math.floor(x / globals.TILE_SIZE);
    y = Math.floor(y / globals.TILE_SIZE);
    return y * (header.mapWidth + 1) + x;
  };

  const flagToColour = (flag: number) => {
    //Electric 2
    if (flag & (1 << 2)) return [255, 255, 255, 255];
    return [0, 0, 0, 0];
  };

  const coordColours = useMemo(
    () => {
      return tileGrid.flatMap((tile) => flagToColour(tile.flags));
    }, //data.YCrd[1000].obj.flatMap(elevationToRGBA),
    [data.Atrb[1000].obj, globals, header],
  );

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
  }, [header, data.YCrd[1000].obj]);

  const setPixel = (x: number, y: number, value: number) => {
    if (
      x < 0 ||
      x > (header.mapWidth + 1) * globals.TILE_SIZE ||
      y < 0 ||
      y > (header.mapHeight + 1) * globals.TILE_SIZE
    )
      return;
    const flatPos = flattenCoords(x, y);
    setData((data) => {
      if (data.YCrd[1000].obj[flatPos] === undefined) return;

      if (currentTopologyValueMode === TopologyValueMode.SET_VALUE) {
        data.YCrd[1000].obj[flatPos] = value;
      } else if (currentTopologyValueMode === TopologyValueMode.DELTA_VALUE) {
        data.YCrd[1000].obj[flatPos] = data.YCrd[1000].obj[flatPos] + value;
      }

      //Clamp
      if (data.YCrd[1000].obj[flatPos] < header.minY) {
        data.YCrd[1000].obj[flatPos] = header.minY;
      }
      if (data.YCrd[1000].obj[flatPos] > header.maxY) {
        data.YCrd[1000].obj[flatPos] = header.maxY;
      }
    });
  };

  return (
    <Layer imageSmoothingEnabled={false}>
      <Image
        x={0}
        y={0}
        width={header.mapWidth * globals.TILE_SIZE}
        height={header.mapHeight * globals.TILE_SIZE}
        onClick={(e) => {
          //e.evt.
          if (!isEditingTopology) return;
          const pos = e.target.getStage()?.getRelativePointerPosition();
          if (!pos) return;

          const baseX =
            Math.round(pos.x) - (topologyBrushRadius - 1) * globals.TILE_SIZE;
          const baseY =
            Math.round(pos.y) - (topologyBrushRadius - 1) * globals.TILE_SIZE;

          for (let i = 0; i < (topologyBrushRadius - 1) * 2 + 1; i++) {
            for (let j = 0; j < (topologyBrushRadius - 1) * 2 + 1; j++) {
              setPixel(
                baseX + i * globals.TILE_SIZE,
                baseY + j * globals.TILE_SIZE,
                topologyValue,
              );
            }
          }
        }}
        image={imgCanvas}
      />
    </Layer>
  );
}
