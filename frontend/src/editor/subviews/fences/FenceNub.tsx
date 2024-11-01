import { useState } from "react";
import { Circle } from "react-konva";

export default function FenceNub({
  nub,
  setNub,
}: {
  nub: [number, number];
  setNub: (nub: [number, number]) => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <Circle
      x={nub[0]}
      y={nub[1]}
      radius={20}
      draggable
      fill={dragging ? "red" : "blue"}
      onDragStart={() => {
        setDragging(true);
      }}
      onDragEnd={(e) => {
        setDragging(false);
        setNub([Math.round(e.target.x()), Math.round(e.target.y())]);
      }}
    />
  );
}
