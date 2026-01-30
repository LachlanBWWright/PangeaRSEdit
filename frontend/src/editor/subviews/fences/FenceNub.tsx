import { useAtom } from "jotai";
import { Circle } from "react-konva";
import { SelectedFence } from "../../../data/fences/fenceAtoms";
<<<<<<< HEAD
import { memo, useRef } from "react";
import { Globals } from "../../../data/globals/globals";
import { getFenceColor } from "../../../data/fences/getFenceColor";
=======
import { getColour } from "./Fence";
import { memo } from "react";
>>>>>>> origin/main

export const FenceNub = memo(
  ({
    nub,
    idx,
    setNub,
  }: {
    nub: [number, number];
    idx: number;
    setNub: (nub: [number, number]) => void;
  }) => {
    const [selectedFence, setSelectedFence] = useAtom(SelectedFence);
<<<<<<< HEAD
    const nubRafRef = useRef<number | null>(null);
    const globals = useAtomValue(Globals);

    const strokeColor =
      idx === selectedFence ? "red" : getFenceColor(globals, fenceType, idx);
=======
>>>>>>> origin/main

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
