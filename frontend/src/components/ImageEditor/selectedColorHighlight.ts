import { hexToRgb } from "@/utils/colorUtils";

export function buildSelectedColorHighlightCanvas(
  image: HTMLImageElement | null,
  paletteColors: string[] | undefined,
  highlightSelectedColorUsage: boolean,
  brushColor: string,
): HTMLCanvasElement | null {
  if (!image || !paletteColors || !highlightSelectedColorUsage) {
    return null;
  }

  const rgb = hexToRgb(brushColor);
  if (!rgb) return null;

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const matches =
      data[index] === rgb.r &&
      data[index + 1] === rgb.g &&
      data[index + 2] === rgb.b &&
      (data[index + 3] ?? 0) > 0;

    if (matches) {
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 0;
      data[index + 3] = 220;
    } else {
      data[index + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
