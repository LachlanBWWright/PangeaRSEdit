import { Updater } from "use-immer";
import { LiquidData } from "@/python/structSpecs/LevelTypes";
import { Circle, Line } from "react-konva";
import Konva from "konva";
import { useAtom } from "jotai";
import {
  SelectedWaterBody,
  SelectedWaterNub,
} from "../../../data/water/waterAtoms";
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
    const [selectedWaterNub, setSelectedWaterNub] = useAtom(SelectedWaterNub);
    const waterBody = liquidData.Liqd[1000].obj[waterBodyIdx];
    const [initialDragState, setInitialDragState] = useState<
      [number, number][] | null
    >(null);
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
          perfectDrawEnabled={false}
          onClick={() => setSelectedWaterBody(waterBodyIdx)}
          closed
          fill={waterBodyIdx === selectedWaterBody ? "#9999FFDD" : "#9999FF77"}
          draggable
          onDragStart={() => {
            const waterBody = liquidData.Liqd[1000].obj[waterBodyIdx];
            if (!waterBody) return;
            setInitialDragState(
              waterBody.nubs
                .filter((_, nubIdx) => nubIdx < waterBody.numNubs)
                .map((nub) => [nub[0], nub[1]]),
            );
            setSelectedWaterBody(waterBodyIdx);
          }}
          onDragMove={() => {
            // No per-frame state updates — let Konva handle visuals while dragging.
          }}
          onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
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
        {waterBodyIdx === selectedWaterBody &&
          (() => {
            const waterBody = liquidData.Liqd[1000].obj[waterBodyIdx];
            if (!waterBody) return null;
            return waterBody.nubs.map((nub, nubIdx) => {
              if (waterBody.numNubs <= nubIdx) return null;

              return (
                <Circle
                  x={nub[0]}
                  y={nub[1]}
                  key={waterBodyIdx + "-" + nubIdx}
                  radius={
                    selectedWaterNub === nubIdx &&
                    selectedWaterBody === waterBodyIdx
                      ? 8
                      : 5
                  }
                  fill={
                    selectedWaterNub === nubIdx &&
                    selectedWaterBody === waterBodyIdx
                      ? "#FF99FFDD"
                      : "#9999FFDD"
                  }
                  stroke="black"
                  strokeWidth={2}
                  draggable={true}
                  perfectDrawEnabled={false}
                  onClick={() => {
                    setSelectedWaterBody(waterBodyIdx);
                    setSelectedWaterNub(nubIdx);
                  }}
                  onDragStart={() => {
                    setSelectedWaterBody(waterBodyIdx);
                    setSelectedWaterNub(nubIdx);
                  }}
                  onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
                    const newX = Math.round(e.target.x());
                    const newY = Math.round(e.target.y());

                    const existingRafId = nubRafRefs.current[nubIdx];
                    if (existingRafId !== undefined)
                      if (existingRafId !== null) cancelAnimationFrame(existingRafId);
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
                  onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
                    const existingRafIdEnd = nubRafRefs.current[nubIdx];
                    if (existingRafIdEnd !== undefined)
                      if (existingRafIdEnd !== null) cancelAnimationFrame(existingRafIdEnd);
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
                const wb = liquidData.Liqd[1000].obj[waterBodyIdx];
                if (!wb) return;
                wb.hotSpotX = Math.round(e.target.x());
                wb.hotSpotZ = Math.round(e.target.y());
              })
            }
          />
        )}
      </>
    );
  },
);
