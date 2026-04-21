import { useRef, useEffect } from "react";
import { Group, Rect, Text } from "react-konva";
import type Konva from "konva";

export const ITEM_BOX_SIZE = 12;
export const ITEM_BOX_OFFSET = ITEM_BOX_SIZE / 2;
export const ITEM_TAG_GAP = 4;

export interface HoverTagInfo {
  x: number;
  y: number;
  text: string;
  fill: string;
  textColor: string;
}

function estimateTagWidth(label: string) {
  return Math.max(ITEM_BOX_SIZE, label.length * 6 + 8);
}

export function ItemTypeNumber({
  x,
  y,
  value,
  fill,
}: {
  x: number;
  y: number;
  value: string;
  fill: string;
}) {
  return (
    <Text
      x={x}
      y={y}
      width={ITEM_BOX_SIZE}
      height={ITEM_BOX_SIZE}
      text={value}
      fill={fill}
      fontSize={9}
      fontStyle="bold"
      align="center"
      verticalAlign="middle"
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}

export function HoverNameTag({
  x,
  y,
  text,
  fill,
  textColor,
}: {
  x: number;
  y: number;
  text: string;
  fill: string;
  textColor: string;
}) {
  const width = estimateTagWidth(text);
  const groupRef = useRef<Konva.Group>(null);

  // Ensure the tag is always drawn above other nodes in the same layer
  useEffect(() => {
    groupRef.current?.moveToTop();
  });

  return (
    <Group ref={groupRef} x={x} y={y}>
      <Rect
        width={width}
        height={ITEM_BOX_SIZE}
        fill={fill}
        cornerRadius={2}
        listening={false}
        perfectDrawEnabled={false}
      />
      <Text
        width={width}
        height={ITEM_BOX_SIZE}
        text={text}
        fill={textColor}
        fontSize={9}
        fontStyle="bold"
        align="center"
        verticalAlign="middle"
        listening={false}
        perfectDrawEnabled={false}
      />
    </Group>
  );
}
