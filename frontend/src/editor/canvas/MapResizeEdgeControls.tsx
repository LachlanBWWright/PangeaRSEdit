import { Arrow, Group, Layer, Rect } from "react-konva";
import type Konva from "konva";
import { useState } from "react";
import { ResultAsync } from "neverthrow";

export type MapResizeDirection = "top" | "bottom" | "left" | "right";

interface MapResizeEdgeControlsProps {
  mapWidth: number;
  mapHeight: number;
  tileSize: number;
  tilesPerUnit: number;
  onResize: (direction: MapResizeDirection, amount: number) => Promise<void>;
}

const CONTROL_SIZE = 28;
const CONTROL_GAP = 6;
const EDGE_GAP = 8;
const oppositeDirections: Record<MapResizeDirection, MapResizeDirection> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};
const arrowPointsByDirection: Record<MapResizeDirection, number[]> = {
  top: [14, 21, 14, 7],
  bottom: [14, 7, 14, 21],
  left: [21, 14, 7, 14],
  right: [7, 14, 21, 14],
};

function stopEvent(event: Konva.KonvaEventObject<MouseEvent>): void {
  event.cancelBubble = true;
}

function ResizeButton({
  x,
  y,
  direction,
  amount,
  disabled,
  onClick,
}: {
  x: number;
  y: number;
  direction: MapResizeDirection;
  amount: 1 | -1;
  disabled: boolean;
  onClick: () => void;
}) {
  const arrowDirection =
    amount > 0 ? direction : oppositeDirections[direction];
  const arrowPoints = arrowPointsByDirection[arrowDirection];
  const activeFill = amount > 0 ? "#2563eb" : "#dc2626";

  return (
    <Group
      x={x}
      y={y}
      onMouseDown={stopEvent}
      onClick={(event) => {
        event.cancelBubble = true;
        if (!disabled) onClick();
      }}
    >
      <Rect
        width={CONTROL_SIZE}
        height={CONTROL_SIZE}
        cornerRadius={5}
        fill={disabled ? "#374151" : activeFill}
        stroke={disabled ? "#4b5563" : "#f9fafb"}
        strokeWidth={1}
        shadowColor="#000"
        shadowBlur={4}
        shadowOpacity={0.4}
      />
      <Arrow
        points={arrowPoints}
        stroke={disabled ? "#6b7280" : "#f9fafb"}
        fill={disabled ? "#6b7280" : "#f9fafb"}
        strokeWidth={2}
        pointerLength={4}
        pointerWidth={4}
      />
    </Group>
  );
}

export function MapResizeEdgeControls({
  mapWidth,
  mapHeight,
  tileSize,
  tilesPerUnit,
  onResize,
}: MapResizeEdgeControlsProps) {
  const [isResizing, setIsResizing] = useState(false);
  const width = mapWidth * tileSize;
  const height = mapHeight * tileSize;
  const pairSize = CONTROL_SIZE * 2 + CONTROL_GAP;
  const horizontalX = (width - pairSize) / 2;
  const verticalY = (height - pairSize) / 2;
  const canRemoveRow = mapHeight > tilesPerUnit;
  const canRemoveColumn = mapWidth > tilesPerUnit;
  const resize = (direction: MapResizeDirection, amount: 1 | -1): void => {
    if (isResizing) return;
    setIsResizing(true);
    void ResultAsync.fromPromise(onResize(direction, amount), () => undefined).then(
      () => setIsResizing(false),
    );
  };

  const renderPair = (
    direction: MapResizeDirection,
    x: number,
    y: number,
    vertical: boolean,
    canRemove: boolean,
  ) => (
    <Group x={x} y={y}>
      <ResizeButton
        x={0}
        y={0}
        direction={direction}
        amount={1}
        disabled={isResizing}
        onClick={() => resize(direction, 1)}
      />
      <ResizeButton
        x={vertical ? 0 : CONTROL_SIZE + CONTROL_GAP}
        y={vertical ? CONTROL_SIZE + CONTROL_GAP : 0}
        direction={direction}
        amount={-1}
        disabled={isResizing || !canRemove}
        onClick={() => resize(direction, -1)}
      />
    </Group>
  );

  return (
    <Layer>
      {renderPair("top", horizontalX, -CONTROL_SIZE - EDGE_GAP, false, canRemoveRow)}
      {renderPair("bottom", horizontalX, height + EDGE_GAP, false, canRemoveRow)}
      {renderPair("left", -CONTROL_SIZE - EDGE_GAP, verticalY, true, canRemoveColumn)}
      {renderPair("right", width + EDGE_GAP, verticalY, true, canRemoveColumn)}
    </Layer>
  );
}
