import {
  OTTO_TILE_SIZE,
  ottoMaticLevel,
} from "../../python/structSpecs/ottoMaticInterface";
import { Layer, Image } from "react-konva";
import { Updater } from "use-immer";

export function TopologyGrid({
  data,
  setData,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
}) {
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

  return (
    <Layer imageSmoothingEnabled={false}>
      <Image
        x={0}
        y={0}
        width={(header.mapWidth + 1) * OTTO_TILE_SIZE}
        height={(header.mapHeight + 1) * OTTO_TILE_SIZE}
        onMouseDown={(e) => {
          const pos = e.target.getStage()?.getRelativePointerPosition();
          if (!pos) return;
          const flatPos = flattenCoords(pos.x, pos.y);

          setData((data) => {
            if (data.YCrd[1000].obj[flatPos] === undefined) return;
            data.YCrd[1000].obj[flatPos] = data.YCrd[1000].obj[flatPos] - 100;
          });
        }}
        image={imgCanvas}
      />
    </Layer>
  );
}
