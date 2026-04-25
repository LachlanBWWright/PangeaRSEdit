import type { BrushStroke } from "@/components/ImageEditor/types";

export interface CanvasLayoutSize {
  readonly width: number;
  readonly height: number;
}

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

export function getLineCap(shape: BrushStroke["shape"]): "round" | "square" {
  return shape === "circle" ? "round" : "square";
}

export function getLineJoin(shape: BrushStroke["shape"]): "round" | "miter" {
  return shape === "circle" ? "round" : "miter";
}
