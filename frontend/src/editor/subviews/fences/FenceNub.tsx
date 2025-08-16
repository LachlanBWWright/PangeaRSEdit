import { useAtomValue, useAtom } from "jotai";
import { Circle } from "react-konva";
import { SelectedFence } from "../../../data/fences/fenceAtoms";
import { memo } from "react";
import { Globals } from "../../../data/globals/globals";
import { getFenceColor } from "../../../data/fences/getFenceColor";

export const FenceNub = memo(
  ({
    nub,
    idx,
    fenceType,
    setNub,
  }: {
    nub: [number, number];
    idx: number;
    fenceType: number;
    setNub: (nub: [number, number]) => void;
  }) => {
    const [selectedFence, setSelectedFence] = useAtom(SelectedFence);
    const globals = useAtomValue(Globals);

    const strokeColor =
      idx === selectedFence ? "red" : getFenceColor(globals, fenceType, idx);

    return (
      <Circle
        x={nub[0]}
        y={nub[1]}
        radius={20}
        draggable
        fill={strokeColor}
        stroke={"black"}
        strokeWidth={2}
        onMouseDown={() => setSelectedFence(idx)}
        onDragStart={() => {
          setSelectedFence(idx);
        }}
        onDragEnd={(e) => {
          setNub([Math.round(e.target.x()), Math.round(e.target.y())]);
        }}
      />
    );
  },
);
