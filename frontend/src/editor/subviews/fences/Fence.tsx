import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { Line } from "react-konva";
import { FenceNub } from "./FenceNub";
import { SelectedFence } from "../../../data/fences/fenceAtoms";
import { useAtom, useAtomValue } from "jotai";
import { memo, useState } from "react"; // Added useState
import { Globals } from "../../../data/globals/globals";
import { getFenceColor } from "../../../data/fences/getFenceColor";

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
    const globals = useAtomValue(Globals);
    // State to store initial nub positions during drag
    const [initialDragState, setInitialDragState] = useState<
      [number, number][] | null
    >(null);

    const lines = data.FnNb[1000 + fenceIdx].obj.flatMap((nub) => [
      nub[0],
      nub[1],
    ]);

    // Get fence type from fence data
    const fenceType = data.Fenc[1000].obj[fenceIdx]?.fenceType || 0;

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
            setInitialDragState(
              data.FnNb[1000 + fenceIdx].obj.map((nub) => [nub[0], nub[1]]),
            );
            setSelectedFence(fenceIdx); // Select the fence on drag start
          }}
          onDragEnd={(e) => {
            if (!initialDragState) return;

            const dragDx = e.target.x();
            const dragDz = e.target.y();

            setData((draft) => {
              const currentNubs = draft.FnNb[1000 + fenceIdx].obj;
              for (let i = 0; i < currentNubs.length; i++) {
                currentNubs[i][0] = initialDragState[i][0] + dragDx;
                currentNubs[i][1] = initialDragState[i][1] + dragDz;
              }
            });
            e.target.x(0); // Reset line position after dragging nubs
            e.target.y(0); // Reset line position after dragging nubs
            setInitialDragState(null); // Clear initial drag state
          }}
        />
        {data.FnNb[1000 + fenceIdx].obj.map((nub, nubIdx) => (
          <FenceNub
            key={nubIdx}
            idx={fenceIdx}
            nub={nub}
            fenceType={fenceType}
            setNub={(newNub: [number, number]) => {
              setData((data) => {
                data.FnNb[1000 + fenceIdx].obj[nubIdx] = newNub;
              });
            }}
          />
        ))}
      </>
    );
  },
);
