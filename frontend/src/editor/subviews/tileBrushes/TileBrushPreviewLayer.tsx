import { Layer, Rect } from "react-konva";
import { useAtomValue } from "jotai";
import {
  selectedTileBrushIdAtom,
  tileBrushAnchorAtom,
  tileBrushesAtom,
  tileBrushModeAtom,
  tileBrushPreviewAtom,
} from "@/data/tileBrushes/tileBrushAtoms";
import { getBrushTargetCells } from "@/data/tileBrushes/tileBrushApply";

interface TileBrushPreviewLayerProps {
  tileSize: number;
  mapWidth: number;
  mapHeight: number;
}

export function TileBrushPreviewLayer({
  tileSize,
  mapWidth,
  mapHeight,
}: TileBrushPreviewLayerProps) {
  const mode = useAtomValue(tileBrushModeAtom);
  const preview = useAtomValue(tileBrushPreviewAtom);
  const brushes = useAtomValue(tileBrushesAtom);
  const selectedBrushId = useAtomValue(selectedTileBrushIdAtom);
  const anchor = useAtomValue(tileBrushAnchorAtom);

  if (mode !== "stamp" || !preview) return null;

  const brush = brushes.find((b) => b.id === selectedBrushId);
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
