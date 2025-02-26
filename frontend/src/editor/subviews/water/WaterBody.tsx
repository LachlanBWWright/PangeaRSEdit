import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { Circle, Line } from "react-konva";
import { useAtom } from "jotai";
import { SelectedWaterBody } from "../../../data/water/waterAtoms";

export function WaterBody({
  data,
  setData,
  waterBodyIdx,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  waterBodyIdx: number;
}) {
  const [selectedWaterBody, setSelectedWaterBody] = useAtom(SelectedWaterBody);
  const waterBody = data.Liqd[1000].obj[waterBodyIdx];

  if (!waterBody) return <></>;

  const waterNubs = waterBody.nubs
    .filter((_, nubIdx) => nubIdx < waterBody.numNubs)
    .flatMap((nub) => [nub[0], nub[1]]);

  return (
    <>
      <Line
        points={waterNubs}
        stroke={waterBodyIdx === selectedWaterBody ? "#9999FFDD" : "#9999FF77"}
        strokeWidth={waterBodyIdx === selectedWaterBody ? 5 : 2}
        onClick={() => setSelectedWaterBody(waterBodyIdx)}
        closed
        fill={waterBodyIdx === selectedWaterBody ? "#9999FFDD" : "#9999FF77"}
      />
      {waterBodyIdx === selectedWaterBody &&
        data.Liqd[1000].obj[waterBodyIdx].nubs.map((nub, nubIdx) => {
          if (data.Liqd[1000].obj[waterBodyIdx].numNubs <= nubIdx) return;

          return (
            <>
              <Circle
                x={nub[0]}
                y={nub[1]}
                key={waterBodyIdx}
                radius={5}
                fill={"#9999FFDD"}
                draggable={true}
                onDragStart={() => setSelectedWaterBody(waterBodyIdx)}
                onDragEnd={(e) => {
                  setData((data) => {
                    data.Liqd[1000].obj[waterBodyIdx].nubs[nubIdx][0] =
                      Math.round(e.target.x());
                    data.Liqd[1000].obj[waterBodyIdx].nubs[nubIdx][1] =
                      Math.round(e.target.y());
                  });
                }}
              />
            </>
          );
        })}
      {selectedWaterBody === waterBodyIdx && (
        <Circle
          x={waterBody.hotSpotX}
          y={waterBody.hotSpotZ}
          radius={10}
          fill="orange"
          draggable
          onDragEnd={(e) =>
            setData((data) => {
              data.Liqd[1000].obj[waterBodyIdx].hotSpotX = Math.round(
                e.target.x(),
              );
              data.Liqd[1000].obj[waterBodyIdx].hotSpotZ = Math.round(
                e.target.y(),
              );
            })
          }
        />
      )}
    </>
  );
}
