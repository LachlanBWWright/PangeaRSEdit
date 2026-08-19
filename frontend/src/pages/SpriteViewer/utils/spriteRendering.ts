import type { ShapeFrame } from "@/parsers/mightyMikeShapesParser";
import { shapeFrameToCanvas } from "@/parsers/mightyMikeShapesParser";
import type { DisplayOptions } from "../components/DisplayOptionsPanel";
import type { PaletteColor } from "./paletteUtils";
import type { SpriteRenderParams } from "../types";

const CANVAS_PADDING = 40;

export interface SpriteCanvasRenderInput {
  readonly canvas: HTMLCanvasElement;
  readonly frame: ShapeFrame;
  readonly colors: readonly PaletteColor[];
  readonly options: DisplayOptions;
  readonly onRenderParams: (params: SpriteRenderParams) => void;
}

export function renderSpriteCanvas(input: SpriteCanvasRenderInput): boolean {
  const sourceCanvasResult = shapeFrameToCanvas(input.frame, Array.from(input.colors));
  if (sourceCanvasResult.isErr()) return false;

  const { frame, options, canvas } = input;
  const zoom = options.zoomLevel;
  const spriteW = frame.header.width;
  const spriteH = frame.header.height;
  const offsetX = frame.header.offsetX;
  const offsetY = frame.header.offsetY;
  const leftSpace = offsetX + CANVAS_PADDING;
  const topSpace = offsetY + CANVAS_PADDING;
  const rightSpace = spriteW - offsetX + CANVAS_PADDING;
  const bottomSpace = spriteH - offsetY + CANVAS_PADDING;
  canvas.width = Math.max((leftSpace + rightSpace) * zoom, 100);
  canvas.height = Math.max((topSpace + bottomSpace) * zoom, 100);

  const originX = leftSpace * zoom;
  const originY = topSpace * zoom;
  input.onRenderParams({
    originX,
    originY,
    zoom,
    spriteOffsetX: offsetX,
    spriteOffsetY: offsetY,
    spriteW,
    spriteH,
  });

  const context = canvas.getContext("2d");
  if (!context) return false;

  context.fillStyle = options.backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (options.showGrid) drawGrid(context, canvas, zoom);

  const spriteDrawX = originX - offsetX * zoom;
  const spriteDrawY = originY - offsetY * zoom;
  context.imageSmoothingEnabled = false;
  context.drawImage(
    sourceCanvasResult.value,
    spriteDrawX,
    spriteDrawY,
    spriteW * zoom,
    spriteH * zoom,
  );

  if (options.showBounds) {
    context.strokeStyle = "rgba(0, 255, 0, 0.5)";
    context.lineWidth = 2;
    context.strokeRect(spriteDrawX, spriteDrawY, spriteW * zoom, spriteH * zoom);
  }
  drawCrosshair(context, originX, originY);
  return true;
}

function drawGrid(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  zoom: number,
): void {
  context.strokeStyle = "rgba(255, 255, 255, 0.1)";
  context.lineWidth = 1;
  const gridSize = 10 * zoom;
  for (let x = 0; x < canvas.width; x += gridSize) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSize) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }
}

function drawCrosshair(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
): void {
  const crosshairSize = 10;
  context.strokeStyle = "rgba(255, 0, 0, 0.8)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(originX - crosshairSize, originY);
  context.lineTo(originX + crosshairSize, originY);
  context.stroke();
  context.beginPath();
  context.moveTo(originX, originY - crosshairSize);
  context.lineTo(originX, originY + crosshairSize);
  context.stroke();
}

export function renderImageCanvas(
  canvas: HTMLCanvasElement,
  sourceCanvas: HTMLCanvasElement,
  options: DisplayOptions,
): boolean {
  const scaledWidth = sourceCanvas.width * options.zoomLevel;
  const scaledHeight = sourceCanvas.height * options.zoomLevel;
  canvas.width = Math.max(scaledWidth, 100);
  canvas.height = Math.max(scaledHeight, 100);
  const context = canvas.getContext("2d");
  if (!context) return false;
  context.fillStyle = options.backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = false;
  context.drawImage(sourceCanvas, 0, 0, scaledWidth, scaledHeight);
  return true;
}

export function getSpritePixelIndex(
  params: SpriteRenderParams,
  canvasX: number,
  canvasY: number,
): number | null {
  const spriteDrawX = params.originX - params.spriteOffsetX * params.zoom;
  const spriteDrawY = params.originY - params.spriteOffsetY * params.zoom;
  const pixelX = Math.floor((canvasX - spriteDrawX) / params.zoom);
  const pixelY = Math.floor((canvasY - spriteDrawY) / params.zoom);
  if (
    pixelX < 0 ||
    pixelX >= params.spriteW ||
    pixelY < 0 ||
    pixelY >= params.spriteH
  ) {
    return null;
  }
  return pixelY * params.spriteW + pixelX;
}
