import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { Line } from "react-konva";
import { FenceNub } from "./FenceNub";
import { SelectedFence } from "../../../data/fences/fenceAtoms";
import { useAtom } from "jotai";
import { memo, useState } from "react"; // Added useState

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

    const lines = data.FnNb[1000 + fenceIdx].obj.flatMap((nub) => [
      nub[0],
      nub[1],
    ]);

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
