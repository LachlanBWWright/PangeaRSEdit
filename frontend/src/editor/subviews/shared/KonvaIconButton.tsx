import { Circle, Group, Text } from "react-konva";

export function KonvaIconButton({
  x,
  y,
  label,
  backgroundColor,
  onClick,
}: {
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly backgroundColor: string;
  readonly onClick: () => void;
}) {
  const radius = 12;
  return (
    <Group x={x} y={y} onClick={onClick} onTap={onClick} listening>
      <Circle radius={radius} fill={backgroundColor} stroke="#fff" strokeWidth={1} />
      <Text
        text={label}
        fontSize={14}
        fontStyle="bold"
        fill="#fff"
        align="center"
        verticalAlign="middle"
        x={-radius}
        y={-radius}
        width={radius * 2}
        height={radius * 2}
        listening={false}
      />
    </Group>
  );
}
