import {
  TILE_FLIPX_MASK,
  TILE_FLIPY_MASK,
  TILE_ROTATE_MASK,
  TILENUM_MASK,
} from "@/editor/subviews/bugdom/BugdomTileRenderer.utils";
import type { TileBrush, TileBrushCell, TileBrushGame } from "./tileBrushTypes";

function rotateTileValueClockwise(
  game: TileBrushGame,
  tileValue: number,
): number {
  if (game === "mightymike") {
    return tileValue;
  }

  const index = tileValue & TILENUM_MASK;
  const rotation = (tileValue & TILE_ROTATE_MASK) >> 12;
  const nextRotation = (rotation + 1) % 4;
  const flipBits = tileValue & (TILE_FLIPX_MASK | TILE_FLIPY_MASK);
  return index | (nextRotation << 12) | flipBits;
}

function flipTileValueHorizontal(
  game: TileBrushGame,
  tileValue: number,
): number {
  if (game === "mightymike") {
    return tileValue;
  }
  return tileValue ^ TILE_FLIPX_MASK;
}

function flipTileValueVertical(game: TileBrushGame, tileValue: number): number {
  if (game === "mightymike") {
    return tileValue;
  }
  return tileValue ^ TILE_FLIPY_MASK;
}

function mapCells(
  brush: TileBrush,
  transform: (
    cell: TileBrushCell,
    x: number,
    y: number,
  ) => { x: number; y: number; cell: TileBrushCell },
  width: number,
  height: number,
): TileBrush {
  const cells: TileBrushCell[] = Array.from({ length: width * height }, () => ({
    tileValue: 0,
    enabled: false,
  }));

  for (let y = 0; y < brush.height; y += 1) {
    for (let x = 0; x < brush.width; x += 1) {
      const source = brush.cells[y * brush.width + x];
      if (!source) {
        continue;
      }
      const mapped = transform(source, x, y);
      cells[mapped.y * width + mapped.x] = mapped.cell;
    }
  }

  return {
    ...brush,
    width,
    height,
    cells,
  };
}

/** Rotates the brush clockwise while preserving the owning game's tile encoding. */
export function rotateTileBrushClockwise(brush: TileBrush): TileBrush {
  return mapCells(
    brush,
    (cell, x, y) => ({
      x: brush.height - 1 - y,
      y: x,
      cell: {
        ...cell,
        tileValue: rotateTileValueClockwise(brush.game, cell.tileValue),
      },
    }),
    brush.height,
    brush.width,
  );
}

/** Mirrors the brush horizontally without changing the source tile values. */
export function flipTileBrushHorizontal(brush: TileBrush): TileBrush {
  return mapCells(
    brush,
    (cell, x, y) => ({
      x: brush.width - 1 - x,
      y,
      cell: {
        ...cell,
        tileValue: flipTileValueHorizontal(brush.game, cell.tileValue),
      },
    }),
    brush.width,
    brush.height,
  );
}

/** Mirrors the brush vertically without changing the source tile values. */
export function flipTileBrushVertical(brush: TileBrush): TileBrush {
  return mapCells(
    brush,
    (cell, x, y) => ({
      x,
      y: brush.height - 1 - y,
      cell: {
        ...cell,
        tileValue: flipTileValueVertical(brush.game, cell.tileValue),
      },
    }),
    brush.width,
    brush.height,
  );
}

/** Returns a copy of the brush with a new display name. */
export function renameTileBrush(brush: TileBrush, name: string): TileBrush {
  return {
    ...brush,
    name,
  };
}

/** Updates one cell in the brush while keeping the rest of the grid immutable. */
export function setTileBrushCell(
  brush: TileBrush,
  cellIndex: number,
  tileValue: number | null,
): TileBrush {
  const nextCells = brush.cells.slice();
  const current = nextCells[cellIndex];
  if (!current) {
    return brush;
  }

  nextCells[cellIndex] =
    tileValue === null
      ? { ...current, enabled: false }
      : { tileValue, enabled: true };

  return {
    ...brush,
    cells: nextCells,
  };
}
