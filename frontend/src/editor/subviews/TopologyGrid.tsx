import {
  OTTO_TILE_SIZE,
  ottoMaticLevel,
} from "../../python/structSpecs/ottoMaticInterface";
import { Layer, Image } from "react-konva";
import { Updater } from "use-immer";
import {
  CurrentTopologyBrushMode,
  CurrentTopologyValueMode,
  TopologyBrushRadius,
  TopologyValue,
  TopologyValueMode,
} from "../../data/topology/topologyAtoms";
import { useAtomValue } from "jotai";

export function TopologyGrid({
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

  console.log(currentTopologyBrushMode, topologyBrushRadius);

  const header = data.Hedr[1000].obj;

  const elevationToRGBA = (elevation: number) => {
    return [
      ((elevation - header.minY) / (header.maxY - header.minY)) * 255,
      ((elevation - header.minY) / (header.maxY - header.minY)) * 255,
      ((elevation - header.minY) / (header.maxY - header.minY)) * 255,
      255,
    ];
  };

  const flattenCoords = (x: number, y: number) => {
    x = Math.floor(x / OTTO_TILE_SIZE);
    y = Math.floor(y / OTTO_TILE_SIZE);
    return y * (header.mapWidth + 1) + x;
  };

  const coordColours = data.YCrd[1000].obj.flatMap(elevationToRGBA);

  const imgCanvas = document.createElement("canvas");
  imgCanvas.width = header.mapWidth + 1;
  imgCanvas.height = header.mapHeight + 1;
  const imgCtx = imgCanvas.getContext("2d");
  if (!imgCtx) return <></>;

  imgCtx.putImageData(
    new ImageData(
      new Uint8ClampedArray(coordColours),
      header.mapWidth + 1,
      header.mapHeight + 1,
    ),
    0,
    0,
  );

  const setPixel = (x: number, y: number, value: number) => {
    if (
      x < 0 ||
      x > (header.mapWidth + 1) * OTTO_TILE_SIZE ||
      y < 0 ||
      y > (header.mapHeight + 1) * OTTO_TILE_SIZE
    )
      return;
    const flatPos = flattenCoords(x, y);
    console.log(flatPos);
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
        width={(header.mapWidth + 1) * OTTO_TILE_SIZE}
        height={(header.mapHeight + 1) * OTTO_TILE_SIZE}
        onMouseDown={(e) => {
          if (!isEditingTopology) return;
          const pos = e.target.getStage()?.getRelativePointerPosition();
          if (!pos) return;

          console.log("TEST2");

          const baseX =
            Math.round(pos.x) - (topologyBrushRadius - 1) * OTTO_TILE_SIZE;
          const baseY =
            Math.round(pos.y) - (topologyBrushRadius - 1) * OTTO_TILE_SIZE;

          for (let i = 0; i < (topologyBrushRadius - 1) * 2 + 1; i++) {
            for (let j = 0; j < (topologyBrushRadius - 1) * 2 + 1; j++) {
              console.log("i", i, "j", j);
              setPixel(
                baseX + i * OTTO_TILE_SIZE,
                baseY + j * OTTO_TILE_SIZE,
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
