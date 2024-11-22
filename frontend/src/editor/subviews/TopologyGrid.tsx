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
  const mapWidth = header.mapWidth;
  const mapHeight = header.mapHeight;
  //Ycrd

  const elevationToRGBA = (elevation: number) => {
    return [
      (elevation / header.maxY) * 255,
      (elevation / header.maxY) * 255,
      (elevation / header.maxY) * 255,
      255,
    ];
  };

  const coordColours = data.YCrd[1000].obj.flatMap(elevationToRGBA);

  const imgCanvas = document.createElement("canvas");
  imgCanvas.width = mapWidth;
  imgCanvas.height = mapHeight;
  const imgCtx = imgCanvas.getContext("2d");
  if (!imgCtx) return <></>;

  imgCtx.putImageData(
    new ImageData(
      new Uint8ClampedArray(coordColours),
      mapWidth + 1,
      mapHeight + 1,
    ),
    0,
    0,
  );

  return (
    <Layer>
      <Image
        x={0}
        y={0}
        width={(mapWidth + 1) * OTTO_TILE_SIZE}
        height={(mapHeight + 1) * OTTO_TILE_SIZE}
        image={imgCanvas}
      />
    </Layer>
  );
}
