import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { Circle, Line } from "react-konva";
import { useAtom } from "jotai";
import {
  SelectedWaterBody,
  SelectedWaterNub,
} from "../../../data/water/waterAtoms"; // Import SelectedWaterNub
import { memo, useState } from "react";

export const WaterBody = memo(
  ({
    data,
    setData,
    waterBodyIdx,
  }: {
    data: ottoMaticLevel;
    setData: Updater<ottoMaticLevel>;
    waterBodyIdx: number;
  }) => {
    const [selectedWaterBody, setSelectedWaterBody] =
      useAtom(SelectedWaterBody);
    const [selectedWaterNub, setSelectedWaterNub] = useAtom(SelectedWaterNub); // Use SelectedWaterNub atom
    const waterBody = data.Liqd[1000].obj[waterBodyIdx];
    const [initialDragState, setInitialDragState] = useState<
      [number, number][] | null
    >(null);

    if (!waterBody) return <></>;

    const waterNubs = waterBody.nubs
      .filter((_, nubIdx) => nubIdx < waterBody.numNubs)
      .flatMap((nub) => [nub[0], nub[1]]);

    return (
      <>
        <Line
          points={waterNubs}
          stroke={
            waterBodyIdx === selectedWaterBody ? "#9999FFDD" : "#9999FF77"
          }
          strokeWidth={waterBodyIdx === selectedWaterBody ? 5 : 2}
          onClick={() => setSelectedWaterBody(waterBodyIdx)}
          closed
          fill={waterBodyIdx === selectedWaterBody ? "#9999FFDD" : "#9999FF77"}
          draggable
          onDragStart={() => {
            setInitialDragState(
              data.Liqd[1000].obj[waterBodyIdx].nubs
                .filter(
                  (_, nubIdx) =>
                    nubIdx < data.Liqd[1000].obj[waterBodyIdx].numNubs,
                )
                .map((nub) => [nub[0], nub[1]]),
            );
            setSelectedWaterBody(waterBodyIdx);
          }}
          onDragEnd={(e) => {
            if (!initialDragState) return;

            const dragDx = e.target.x();
            const dragDz = e.target.y();

            setData((draft) => {
              const currentNubs = draft.Liqd[1000].obj[waterBodyIdx].nubs;
              for (let i = 0; i < initialDragState.length; i++) {
                if (i < draft.Liqd[1000].obj[waterBodyIdx].numNubs) {
                  currentNubs[i][0] = initialDragState[i][0] + dragDx;
                  currentNubs[i][1] = initialDragState[i][1] + dragDz;
                }
              }
            });
            e.target.x(0);
            e.target.y(0);
            setInitialDragState(null);
          }}
        />
        {waterBodyIdx === selectedWaterBody &&
          data.Liqd[1000].obj[waterBodyIdx].nubs.map((nub, nubIdx) => {
            if (data.Liqd[1000].obj[waterBodyIdx].numNubs <= nubIdx) return;

            return (
              <>
                <Circle
                  x={nub[0]}
                  y={nub[1]}
                  key={waterBodyIdx + "-" + nubIdx} // More specific key
                  radius={
                    selectedWaterNub === nubIdx &&
                    selectedWaterBody === waterBodyIdx
                      ? 8
                      : 5
                  } // Highlight selected nub
                  fill={
                    selectedWaterNub === nubIdx &&
                    selectedWaterBody === waterBodyIdx
                      ? "#FF99FFDD"
                      : "#9999FFDD"
                  } // Different color for selected nub
                  draggable={true}
                  onClick={() => {
                    setSelectedWaterBody(waterBodyIdx);
                    setSelectedWaterNub(nubIdx); // Set selected nub on click
                  }}
                  onDragStart={() => {
                    setSelectedWaterBody(waterBodyIdx);
                    setSelectedWaterNub(nubIdx); // Set selected nub on drag start
                  }}
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
  },
);
