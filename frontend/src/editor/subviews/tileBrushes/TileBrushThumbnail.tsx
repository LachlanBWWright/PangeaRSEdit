import { useMemo } from "react";
import type { TileBrush, TileBrushGame } from "@/data/tileBrushes/tileBrushTypes";
import { renderTileBrushThumbnail } from "@/data/tileBrushes/tileBrushThumbnail";
import { TileCanvas } from "../shared/TileCanvas";

interface TileBrushThumbnailProps {
  readonly brush: TileBrush;
  readonly game: TileBrushGame;
  readonly mapImages: readonly HTMLCanvasElement[];
  readonly xlatTable: readonly unknown[] | undefined;
  readonly size?: number;
}

export function TileBrushThumbnail({
  brush,
  game,
  mapImages,
  xlatTable,
  size = 40,
}: TileBrushThumbnailProps) {
  const image = useMemo(
    () => renderTileBrushThumbnail({ brush, game, mapImages, xlatTable }),
    [brush, game, mapImages, xlatTable],
  );
  return (
    <span className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded border border-gray-600 bg-gray-900">
      <TileCanvas image={image} size={size} />
    </span>
  );
}
