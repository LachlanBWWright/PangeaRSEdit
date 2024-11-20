import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { Circle, Line, Rect } from "react-konva";
import { useAtom } from "jotai";
import { SelectedWaterBody } from "../../../data/water/waterAtoms";
import { useEffect } from "react";

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

  useEffect(() => {
    setData((data) => {
      const waterBody = data.Liqd[1000].obj[waterBodyIdx];

      if (!waterBody) return;

      let left = waterBody.nubs[0][0];
      let right = waterBody.nubs[0][0];
      let top = waterBody.nubs[0][1];
      let bottom = waterBody.nubs[0][1];

      //Update bounding box
      for (let i = 0; i < waterBody.numNubs; i++) {
        if (waterBody.nubs[i][0] < left) left = waterBody.nubs[i][0];
        if (waterBody.nubs[i][0] > right) right = waterBody.nubs[i][0];
        if (waterBody.nubs[i][1] < top) top = waterBody.nubs[i][1];
        if (waterBody.nubs[i][1] > bottom) bottom = waterBody.nubs[i][1];
      }

      waterBody.bBoxLeft = left;
      waterBody.bBoxRight = right;
      waterBody.bBoxTop = top;
      waterBody.bBoxBottom = bottom;

      //Force hotspots to be within bounding box
      if (waterBody.hotSpotX < left) waterBody.hotSpotX = left;
      if (waterBody.hotSpotX > right) waterBody.hotSpotX = right;
      if (waterBody.hotSpotZ < top) waterBody.hotSpotZ = top;
      if (waterBody.hotSpotZ > bottom) waterBody.hotSpotZ = bottom;
    });
  }, [data.Liqd[1000].obj[waterBodyIdx]]);

  if (!waterBody) return <></>;

  const waterNubs = waterBody.nubs
    .filter((_, nubIdx) => nubIdx < waterBody.numNubs)
    .flatMap((nub) => [nub[0], nub[1]]);

  return (
    <>
      {selectedWaterBody === waterBodyIdx && (
        <Rect
          x={data.Liqd[1000].obj[waterBodyIdx].bBoxLeft}
          y={data.Liqd[1000].obj[waterBodyIdx].bBoxBottom}
          width={
            data.Liqd[1000].obj[waterBodyIdx].bBoxRight -
            data.Liqd[1000].obj[waterBodyIdx].bBoxLeft
          }
          height={
            data.Liqd[1000].obj[waterBodyIdx].bBoxTop -
            data.Liqd[1000].obj[waterBodyIdx].bBoxBottom
          }
          stroke="red"
        />
      )}
      <Line
        points={waterNubs}
        stroke={waterBodyIdx === selectedWaterBody ? "#9999FFDD" : "#9999FF77"}
        strokeWidth={waterBodyIdx === selectedWaterBody ? 5 : 2}
        onClick={() => setSelectedWaterBody(waterBodyIdx)}
        closed
        fill={waterBodyIdx === selectedWaterBody ? "#9999FFDD" : "#9999FF77"}
        zIndex={1}
      />
      {waterBodyIdx === selectedWaterBody &&
        data.Liqd[1000].obj[waterBodyIdx].nubs.map((nub, nubIdx) => {
          if (data.Liqd[1000].obj[waterBodyIdx].numNubs <= nubIdx) return <></>;

          return (
            <>
              <Circle
                x={nub[0]}
                y={nub[1]}
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
