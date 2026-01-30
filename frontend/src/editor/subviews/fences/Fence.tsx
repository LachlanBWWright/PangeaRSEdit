import { Updater } from "use-immer";
<<<<<<< HEAD
import { FenceData } from "@/python/structSpecs/LevelTypes";
=======
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
>>>>>>> origin/main
import { Line } from "react-konva";
import Konva from "konva";
import { FenceNub } from "./FenceNub";
import { SelectedFence } from "../../../data/fences/fenceAtoms";
<<<<<<< HEAD
import { useAtom, useAtomValue } from "jotai";
import { memo, useState } from "react";
import { Globals } from "../../../data/globals/globals";
import { getFenceColor } from "../../../data/fences/getFenceColor";
=======
import { useAtom } from "jotai";
import { memo, useState } from "react"; // Added useState
>>>>>>> origin/main

export const Fence = memo(
  ({
    data,
    setData,
    fenceIdx,
  }: {
    data: ottoMaticLevel;
    setData: Updater<ottoMaticLevel>;
    fenceIdx: number;
  }) => {
    const [selectedFence, setSelectedFence] = useAtom(SelectedFence);
    // State to store initial nub positions during drag
    const [initialDragState, setInitialDragState] = useState<
      [number, number][] | null
    >(null);

<<<<<<< HEAD
    const fenceNubs = fenceData.FnNb[1000 + fenceIdx]?.obj;
    if (!fenceNubs) return null;

    const lines = fenceNubs.flatMap((nub) => [nub[0], nub[1]]);

    // Get fence type from fence data
    const fenceDef = fenceData.Fenc[1000]?.obj[fenceIdx];
    const fenceType = fenceDef?.fenceType ?? 0;

=======
    const lines = data.FnNb[1000 + fenceIdx].obj.flatMap((nub) => [
      nub[0],
      nub[1],
    ]);

>>>>>>> origin/main
    return (
      <>
        <Line
          points={lines}
          stroke={fenceIdx === selectedFence ? "red" : getColour(fenceIdx)}
          strokeWidth={fenceIdx === selectedFence ? 5 : 2}
          onClick={() => setSelectedFence(fenceIdx)}
          draggable // Make the line draggable
          onDragStart={() => {
            // Store the initial positions of the nubs when dragging starts
<<<<<<< HEAD
            const nubData = fenceData.FnNb[1000 + fenceIdx]?.obj;
            if (nubData) {
              setInitialDragState(nubData.map((nub) => [nub[0], nub[1]]));
            }
=======
            setInitialDragState(
              data.FnNb[1000 + fenceIdx].obj.map((nub) => [nub[0], nub[1]]),
            );
>>>>>>> origin/main
            setSelectedFence(fenceIdx); // Select the fence on drag start
          }}
          onDragMove={() => {
            // Don't update nub positions on each move. Visual transform is handled by Konva.
          }}
          onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
            if (!initialDragState) return;

            const dragDx = e.target.x();
            const dragDz = e.target.y();

<<<<<<< HEAD
            setFenceData((draft) => {
              const currentNubs = draft.FnNb[1000 + fenceIdx]?.obj;
              if (!currentNubs) return;
=======
            setData((draft) => {
              const currentNubs = draft.FnNb[1000 + fenceIdx].obj;
>>>>>>> origin/main
              for (let i = 0; i < currentNubs.length; i++) {
                const nub = currentNubs[i];
                const initial = initialDragState[i];
                if (nub && initial) {
                  nub[0] = initial[0] + dragDx;
                  nub[1] = initial[1] + dragDz;
                }
              }
            });
            try {
              e.target.x(0); // Reset line position after dragging nubs
              e.target.y(0); // Reset line position after dragging nubs
            } catch (err) {
              console.warn("Failed to reset Konva node transform:", err);
            }
            setInitialDragState(null); // Clear initial drag state
          }}
        />
<<<<<<< HEAD
        {fenceNubs.map((nub, nubIdx) => (
=======
        {data.FnNb[1000 + fenceIdx].obj.map((nub, nubIdx) => (
>>>>>>> origin/main
          <FenceNub
            key={nubIdx}
            idx={fenceIdx}
            nub={nub}
            setNub={(newNub: [number, number]) => {
<<<<<<< HEAD
              setFenceData((fenceData) => {
                const nubData = fenceData.FnNb[1000 + fenceIdx]?.obj;
                if (nubData && nubData[nubIdx]) {
                  nubData[nubIdx] = newNub;
                }
=======
              setData((data) => {
                data.FnNb[1000 + fenceIdx].obj[nubIdx] = newNub;
>>>>>>> origin/main
              });
            }}
          />
        ))}
      </>
    );
  },
);

export function getColour(index: number) {
  switch (index % 5) {
    case 0:
      return "#339933";
    case 1:
      return "#3399ff";
    case 2:
      return "#993399";
    case 3:
      return "#ff9933";
    case 4:
    default:
      return "#ff3399";
  }
}
