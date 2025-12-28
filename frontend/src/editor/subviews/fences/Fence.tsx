import { Updater } from "use-immer";
import { FenceData } from "@/python/structSpecs/LevelTypes";
import { Line } from "react-konva";
import Konva from "konva";
import { FenceNub } from "./FenceNub";
import { SelectedFence } from "../../../data/fences/fenceAtoms";
import { useAtom, useAtomValue } from "jotai";
import { memo, useState } from "react";
import { Globals } from "../../../data/globals/globals";
import { getFenceColor } from "../../../data/fences/getFenceColor";

export const Fence = memo(
  ({
    fenceData,
    setFenceData,
    fenceIdx,
  }: {
    fenceData: FenceData;
    setFenceData: Updater<FenceData>;
    fenceIdx: number;
  }) => {
    const [selectedFence, setSelectedFence] = useAtom(SelectedFence);
    const globals = useAtomValue(Globals);
    // State to store initial nub positions during drag
    const [initialDragState, setInitialDragState] = useState<
      [number, number][] | null
    >(null);

    const fenceNubs = fenceData.FnNb[1000 + fenceIdx]?.obj;
    if (!fenceNubs) return null;

    const lines = fenceNubs.flatMap((nub) => [nub[0], nub[1]]);

    // Get fence type from fence data
    const fenceDef = fenceData.Fenc[1000]?.obj[fenceIdx];
    const fenceType = fenceDef?.fenceType ?? 0;

    return (
      <>
        <Line
          points={lines}
          stroke={
            fenceIdx === selectedFence
              ? "red"
              : getFenceColor(globals, fenceType, fenceIdx)
          }
          strokeWidth={fenceIdx === selectedFence ? 5 : 2}
          onClick={() => setSelectedFence(fenceIdx)}
          draggable // Make the line draggable
          onDragStart={() => {
            // Store the initial positions of the nubs when dragging starts
            const nubData = fenceData.FnNb[1000 + fenceIdx]?.obj;
            if (nubData) {
              setInitialDragState(nubData.map((nub) => [nub[0], nub[1]]));
            }
            setSelectedFence(fenceIdx); // Select the fence on drag start
          }}
          onDragMove={() => {
            // Don't update nub positions on each move. Visual transform is handled by Konva.
          }}
          onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
            if (!initialDragState) return;

            const dragDx = e.target.x();
            const dragDz = e.target.y();

            setFenceData((draft) => {
              const currentNubs = draft.FnNb[1000 + fenceIdx]?.obj;
              if (!currentNubs) return;
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
        {fenceNubs.map((nub, nubIdx) => (
          <FenceNub
            key={nubIdx}
            idx={fenceIdx}
            nub={nub}
            fenceType={fenceType}
            setNub={(newNub: [number, number]) => {
              setFenceData((fenceData) => {
                const nubData = fenceData.FnNb[1000 + fenceIdx]?.obj;
                if (nubData && nubData[nubIdx]) {
                  nubData[nubIdx] = newNub;
                }
              });
            }}
          />
        ))}
      </>
    );
  },
);
