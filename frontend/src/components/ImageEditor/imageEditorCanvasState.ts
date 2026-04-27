import type { BrushStroke } from "@/components/ImageEditor/types";

export interface CanvasLayoutSize {
  readonly width: number;
  readonly height: number;
}

/** Calculates the canvas layout size used by the image editor. */
export function getCanvasLayoutSize(
  imageWidth: number,
  imageHeight: number,
  scale: number,
): CanvasLayoutSize {
  return {
    width: imageWidth * scale + 160,
    height: imageHeight * scale + 160,
  };
}

/** Maps a brush shape to the Konva line cap used for stroke rendering. */
export function getLineCap(shape: BrushStroke["shape"]): "round" | "square" {
  return shape === "circle" ? "round" : "square";
}

/** Maps a brush shape to the Konva line join used for stroke rendering. */
export function getLineJoin(shape: BrushStroke["shape"]): "round" | "miter" {
  return shape === "circle" ? "round" : "miter";
}
