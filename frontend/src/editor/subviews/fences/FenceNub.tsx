import { useAtom } from "jotai";
import { Circle } from "react-konva";
import { SelectedFence } from "../../../data/fences/fenceAtoms";
import { getColour } from "./Fence";

export default function FenceNub({
  nub,
  idx,
  setNub,
}: {
  nub: [number, number];
  idx: number;
  setNub: (nub: [number, number]) => void;
}) {
  const [selectedFence, setSelectedFence] = useAtom(SelectedFence);

  return (
    <Circle
      x={nub[0]}
      y={nub[1]}
      radius={20}
      draggable
      fill={idx === selectedFence ? "red" : getColour(idx)}
      onMouseDown={() => setSelectedFence(idx)}
      onDragStart={() => {
        setSelectedFence(idx);
      }}
      onDragEnd={(e) => {
        setNub([Math.round(e.target.x()), Math.round(e.target.y())]);
      }}
    />
  );
}
