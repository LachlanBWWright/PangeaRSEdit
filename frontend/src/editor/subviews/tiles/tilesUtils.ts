import { StandardHeader } from "@/python/structSpecs/LevelTypes";
import { GlobalsInterface } from "@/data/globals/globals";

export function flattenCoords(
  xTile: number,
  yTile: number,
  header: StandardHeader,
  globals: GlobalsInterface,
) {
  const tileSize = globals.TILE_SIZE ?? header.tileSize ?? 16;
  const x = Math.floor(xTile / tileSize);
  const y = Math.floor(yTile / tileSize);
  return y * (header.mapWidth + 1) + x;
}

export function elevationToRGBA(header: StandardHeader, elev: number) {
  // Normalize elevation between header.minY and header.maxY and map to grayscale
  const min = header.minY ?? 0;
  const max = header.maxY ?? 255;
  const t = max === min ? 0 : (elev - min) / (max - min);
  const v = Math.max(0, Math.min(255, Math.round(t * 255)));
  return [v, v, v, 255];
}

export default {};
import { Result, ok, err } from "@/types/result";

export function createImageCanvas(
  width: number,
  height: number,
  coordColours: number[],
): Result<HTMLCanvasElement, Error> {
  const imgCanvas = document.createElement("canvas");
  imgCanvas.width = width;
  imgCanvas.height = height;
  const imgCtx = imgCanvas.getContext("2d");
  if (!imgCtx) return err(new Error("Could not get canvas context"));

  imgCtx.putImageData(
    new ImageData(new Uint8ClampedArray(coordColours), width, height),
    0,
    0,
  );

  return ok(imgCanvas);
}
