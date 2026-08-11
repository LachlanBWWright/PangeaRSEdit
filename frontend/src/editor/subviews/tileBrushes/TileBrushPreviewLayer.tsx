import { Layer, Rect } from "react-konva";
import { useAtomValue } from "jotai";
import {
  getSelectedTileBrushIdAtom,
  getTileBrushAnchorAtom,
  tileBrushesAtom,
  getTileBrushModeAtom,
  tileBrushPreviewAtom,
} from "@/data/tileBrushes/tileBrushAtoms";
import { getBrushTargetCells } from "@/data/tileBrushes/tileBrushApply";
import type { TileBrushGame } from "@/data/tileBrushes/tileBrushTypes";

interface TileBrushPreviewLayerProps {
  game: TileBrushGame;
  tileSize: number;
  mapWidth: number;
  mapHeight: number;
}

export function TileBrushPreviewLayer({
  game,
  tileSize,
  mapWidth,
  mapHeight,
}: TileBrushPreviewLayerProps) {
  const mode = useAtomValue(getTileBrushModeAtom(game));
  const preview = useAtomValue(tileBrushPreviewAtom);
  const brushes = useAtomValue(tileBrushesAtom);
  const selectedBrushId = useAtomValue(getSelectedTileBrushIdAtom(game));
  const anchor = useAtomValue(getTileBrushAnchorAtom(game));

  if (mode !== "stamp" || !preview) return null;

  const brush = brushes.find(
    (candidate) => candidate.game === game && candidate.id === selectedBrushId,
  );
  if (!brush) return null;

  const targets = getBrushTargetCells({
    targetX: preview.x,
    targetY: preview.y,
    brush,
    anchor,
  });

  const cells = targets.filter(
    (t) =>
      t.enabled && t.x >= 0 && t.y >= 0 && t.x < mapWidth && t.y < mapHeight,
  );

  return (
    <Layer listening={false}>
      {cells.map((cell) => (
        <Rect
          key={`${cell.x}-${cell.y}`}
          x={cell.x * tileSize}
          y={cell.y * tileSize}
          width={tileSize}
          height={tileSize}
          fill="rgba(56, 189, 248, 0.35)"
          stroke="rgba(56, 189, 248, 0.85)"
          strokeWidth={1}
        />
      ))}
    </Layer>
  );
}
