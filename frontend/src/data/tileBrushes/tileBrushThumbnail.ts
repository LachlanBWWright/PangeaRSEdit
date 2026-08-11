import { z } from "zod";
import {
  TILE_FLIPX_MASK,
  TILE_FLIPY_MASK,
  TILE_ROTATE_MASK,
  TILENUM_MASK,
} from "@/editor/subviews/bugdom/BugdomTileRenderer.utils";
import type { TileBrush, TileBrushGame } from "./tileBrushTypes";

const xlatEntrySchema = z.object({ idx: z.number().int().nonnegative() });

interface TileBrushThumbnailOptions {
  readonly brush: TileBrush;
  readonly game: TileBrushGame;
  readonly mapImages: readonly HTMLCanvasElement[];
  readonly xlatTable: readonly unknown[] | undefined;
  readonly cellSize?: number;
}

export interface TileBrushCellVisual {
  readonly imageIndex: number;
  readonly rotationQuarterTurns: number;
  readonly flipX: boolean;
  readonly flipY: boolean;
}

export function getTileBrushCellVisual(
  game: TileBrushGame,
  tileValue: number,
  xlatTable: readonly unknown[] | undefined,
): TileBrushCellVisual {
  const logicalIndex = game === "mightymike" ? tileValue : tileValue & TILENUM_MASK;
  const parsed = xlatEntrySchema.safeParse(xlatTable?.[logicalIndex]);
  return {
    imageIndex: parsed.success ? parsed.data.idx : logicalIndex,
    rotationQuarterTurns:
      game === "mightymike" ? 0 : (tileValue & TILE_ROTATE_MASK) >> 12,
    flipX: game !== "mightymike" && (tileValue & TILE_FLIPX_MASK) !== 0,
    flipY: game !== "mightymike" && (tileValue & TILE_FLIPY_MASK) !== 0,
  };
}

function drawCell(
  context: CanvasRenderingContext2D,
  image: HTMLCanvasElement,
  game: TileBrushGame,
  tileValue: number,
  x: number,
  y: number,
  cellSize: number,
): void {
  const centerX = x * cellSize + cellSize / 2;
  const centerY = y * cellSize + cellSize / 2;
  const visual = getTileBrushCellVisual(game, tileValue, undefined);

  context.save();
  context.translate(centerX, centerY);
  context.rotate((visual.rotationQuarterTurns * Math.PI) / 2);
  context.scale(visual.flipX ? -1 : 1, visual.flipY ? -1 : 1);
  context.drawImage(image, -cellSize / 2, -cellSize / 2, cellSize, cellSize);
  context.restore();
}

export function renderTileBrushThumbnail({
  brush,
  game,
  mapImages,
  xlatTable,
  cellSize = 24,
}: TileBrushThumbnailOptions): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = brush.width * cellSize;
  canvas.height = brush.height * cellSize;
  const context = canvas.getContext("2d");
  if (!context) return canvas;

  context.fillStyle = "#111827";
  context.fillRect(0, 0, canvas.width, canvas.height);
  brush.cells.forEach((cell, index) => {
    const x = index % brush.width;
    const y = Math.floor(index / brush.width);
    if (!cell.enabled) {
      context.fillStyle = "#374151";
      context.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      return;
    }
    const visual = getTileBrushCellVisual(game, cell.tileValue, xlatTable);
    const image = mapImages[visual.imageIndex];
    if (image) drawCell(context, image, game, cell.tileValue, x, y, cellSize);
  });
  return canvas;
}
