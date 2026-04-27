import { Layer, Rect } from "react-konva";

interface TileBrushCaptureLayerProps {
  tileSize: number;
  captureStart: { x: number; y: number };
  captureEnd: { x: number; y: number };
}

export function TileBrushCaptureLayer({
  tileSize,
  captureStart,
  captureEnd,
}: TileBrushCaptureLayerProps) {
  const minX = Math.min(captureStart.x, captureEnd.x);
  const minY = Math.min(captureStart.y, captureEnd.y);
  const width = Math.abs(captureEnd.x - captureStart.x) + 1;
  const height = Math.abs(captureEnd.y - captureStart.y) + 1;

  return (
    <Layer listening={false}>
      <Rect
        x={minX * tileSize}
        y={minY * tileSize}
        width={width * tileSize}
        height={height * tileSize}
        fill="rgba(251, 191, 36, 0.25)"
        stroke="rgba(251, 191, 36, 0.9)"
        strokeWidth={2}
        dash={[4, 4]}
      />
    </Layer>
  );
}
