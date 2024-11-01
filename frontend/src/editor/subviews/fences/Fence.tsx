import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { Line } from "react-konva";
import FenceNub from "./FenceNub";

export function Fence({
  data,
  setData,
  fenceIdx,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  fenceIdx: number;
}) {
  const lines = data.FnNb[1000 + fenceIdx].obj.flatMap((nub) => [
    nub[0],
    nub[1],
  ]);
  console.log("Lines", lines);

  return (
    <>
      {data.FnNb[1000 + fenceIdx].obj.map((nub, nubIdx) => (
        <FenceNub
          key={nubIdx}
          nub={nub}
          setNub={(newNub: [number, number]) => {
            setData((data) => {
              data.FnNb[1000 + fenceIdx].obj[nubIdx] = newNub;
            });
          }}
        />
      ))}
      <Line points={lines} stroke="red" strokeWidth={5} />
    </>
  );
}
