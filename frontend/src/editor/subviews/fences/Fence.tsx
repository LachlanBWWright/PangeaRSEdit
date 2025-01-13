import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { Line } from "react-konva";
import FenceNub from "./FenceNub";
import { SelectedFence } from "../../../data/fences/fenceAtoms";
import { useAtom } from "jotai";

export function Fence({
  data,
  setData,
  fenceIdx,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  fenceIdx: number;
}) {
  const [selectedFence, setSelectedFence] = useAtom(SelectedFence);
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
}

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
