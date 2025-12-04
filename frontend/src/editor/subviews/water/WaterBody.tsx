import { Updater } from "use-immer";
import { LiquidData } from "../../../python/structSpecs/ottoMaticLevelData";
import { Circle, Line } from "react-konva";
import { useAtom } from "jotai";
import {
  SelectedWaterBody,
  SelectedWaterNub,
} from "../../../data/water/waterAtoms"; // Import SelectedWaterNub
import { memo, useState, useRef } from "react";

export const WaterBody = memo(
  ({
    liquidData,
    setLiquidData,
    waterBodyIdx,
  }: {
    liquidData: LiquidData;
    setLiquidData: Updater<LiquidData>;
    waterBodyIdx: number;
  }) => {
    const [selectedWaterBody, setSelectedWaterBody] =
      useAtom(SelectedWaterBody);
    const [selectedWaterNub, setSelectedWaterNub] = useAtom(SelectedWaterNub); // Use SelectedWaterNub atom
    const waterBody = liquidData.Liqd[1000].obj[waterBodyIdx];
    const [initialDragState, setInitialDragState] = useState<
      [number, number][] | null
    >(null);
    const lineRafRef = useRef<number | null>(null);
    const nubRafRefs = useRef<Record<number, number | null>>({});

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
            const waterBody = liquidData.Liqd[1000].obj[waterBodyIdx];
            if (!waterBody) return;
            setInitialDragState(
              waterBody.nubs
                .filter(
                  (_, nubIdx) =>
                    nubIdx < waterBody.numNubs,
                )
                .map((nub) => [nub[0], nub[1]]),
            );
            setSelectedWaterBody(waterBodyIdx);
          }}
          onDragMove={(e) => {
            if (!initialDragState) return;

            const dragDx = e.target.x();
            const dragDz = e.target.y();

            if (lineRafRef.current) cancelAnimationFrame(lineRafRef.current);
            lineRafRef.current = requestAnimationFrame(() => {
              setLiquidData((draft) => {
                const waterBody = draft.Liqd[1000].obj[waterBodyIdx];
                if (!waterBody) return;
                const currentNubs = waterBody.nubs;
                for (let i = 0; i < initialDragState.length; i++) {
                  const nub = currentNubs[i];
                  const initNub = initialDragState[i];
                  if (nub && initNub && i < waterBody.numNubs) {
                    nub[0] = initNub[0] + dragDx;
                    nub[1] = initNub[1] + dragDz;
                  }
                }
              });
            });
          }}
          onDragEnd={(e) => {
            if (lineRafRef.current) cancelAnimationFrame(lineRafRef.current);
            if (!initialDragState) return;

            const dragDx = e.target.x();
            const dragDz = e.target.y();

            setLiquidData((draft) => {
              const waterBody = draft.Liqd[1000].obj[waterBodyIdx];
              if (!waterBody) return;
              const currentNubs = waterBody.nubs;
              for (let i = 0; i < initialDragState.length; i++) {
                const nub = currentNubs[i];
                const initNub = initialDragState[i];
                if (nub && initNub && i < waterBody.numNubs) {
                  nub[0] = initNub[0] + dragDx;
                  nub[1] = initNub[1] + dragDz;
                }
              }
            });
            e.target.x(0);
            e.target.y(0);
            setInitialDragState(null);
          }}
        />
        {waterBodyIdx === selectedWaterBody && (() => {
          const waterBody = liquidData.Liqd[1000].obj[waterBodyIdx];
          if (!waterBody) return null;
          return waterBody.nubs.map((nub, nubIdx) => {
            if (waterBody.numNubs <= nubIdx) return null;

            return (
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
                onDragMove={(e) => {
                  const newX = Math.round(e.target.x());
                  const newY = Math.round(e.target.y());

                  if (nubRafRefs.current[nubIdx])
                    cancelAnimationFrame(nubRafRefs.current[nubIdx]!);
                  nubRafRefs.current[nubIdx] = requestAnimationFrame(() => {
                    setLiquidData((liquidData) => {
                      const wb = liquidData.Liqd[1000].obj[waterBodyIdx];
                      const nubToUpdate = wb?.nubs[nubIdx];
                      if (nubToUpdate) {
                        nubToUpdate[0] = newX;
                        nubToUpdate[1] = newY;
                      }
                    });
                  });
                }}
                onDragEnd={(e) => {
                  if (nubRafRefs.current[nubIdx])
                    cancelAnimationFrame(nubRafRefs.current[nubIdx]!);
                  setLiquidData((liquidData) => {
                    const wb = liquidData.Liqd[1000].obj[waterBodyIdx];
                    const nubToUpdate = wb?.nubs[nubIdx];
                    if (nubToUpdate) {
                      nubToUpdate[0] = Math.round(e.target.x());
                      nubToUpdate[1] = Math.round(e.target.y());
                    }
                  });
                }}
              />
            );
          });
        })()}
        {selectedWaterBody === waterBodyIdx && (
          <Circle
            x={waterBody.hotSpotX}
            y={waterBody.hotSpotZ}
            radius={10}
            fill="orange"
            draggable
            onDragEnd={(e) =>
              setLiquidData((liquidData) => {
                liquidData.Liqd[1000].obj[waterBodyIdx].hotSpotX = Math.round(
                  e.target.x(),
                );
                liquidData.Liqd[1000].obj[waterBodyIdx].hotSpotZ = Math.round(
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
