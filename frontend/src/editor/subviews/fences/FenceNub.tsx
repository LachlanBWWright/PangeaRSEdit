import { useAtomValue, useAtom } from "jotai";
import { Circle } from "react-konva";
import { SelectedFence } from "../../../data/fences/fenceAtoms";
import { memo, useRef } from "react";
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
    const nubRafRef = useRef<number | null>(null);
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
        onMouseDown={() => { setSelectedFence(idx); }}
        onDragStart={() => {
          setSelectedFence(idx);
        }}
        onDragMove={(e) => {
          const newX = Math.round(e.target.x());
          const newY = Math.round(e.target.y());

          if (nubRafRef.current) cancelAnimationFrame(nubRafRef.current);
          nubRafRef.current = requestAnimationFrame(() => {
            setNub([newX, newY]);
          });
        }}
        onDragEnd={(e) => {
          if (nubRafRef.current) cancelAnimationFrame(nubRafRef.current);
          setNub([Math.round(e.target.x()), Math.round(e.target.y())]);
        }}
      />
    );
  },
);
