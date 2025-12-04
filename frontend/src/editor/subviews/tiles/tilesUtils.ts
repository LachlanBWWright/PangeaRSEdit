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
