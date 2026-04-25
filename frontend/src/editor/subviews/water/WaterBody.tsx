import { ActiveView } from "@/data/globals/activeViewAtom";
import { Updater } from "use-immer";
import {
  LiquidData,
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { Circle, Image as KonvaImage, Line } from "react-konva";
import Konva from "konva";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  SelectedWaterBody,
  SelectedWaterNub,
} from "../../../data/water/waterAtoms";
import { memo, useMemo, useState, useRef } from "react";
import { Globals } from "@/data/globals/globals";
import {
  buildLiquidBodyCanvas,
  getLiquidVisualStyle,
} from "./liquidRenderingUtils";
import {
  applyDraggedBodyOffset,
  cloneVisibleWaterNubs,
  commitWaterHotspotPosition,
  commitWaterNubPosition,
  drawPreviewLine,
  selectWaterBody,
  selectWaterNub,
  updatePreviewNub,
} from "@/editor/subviews/water/waterBodyInteractions";

export const WaterBody = memo(
  ({
    headerData,
    terrainData,
    liquidData,
    setLiquidData,
    waterBodyIdx,
  }: {
    headerData: HeaderData;
    terrainData: TerrainData;
    liquidData: LiquidData;
    setLiquidData: Updater<LiquidData>;
    waterBodyIdx: number;
  }) => {
    const [selectedWaterBody, setSelectedWaterBody] =
      useAtom(SelectedWaterBody);
    const [selectedWaterNub, setSelectedWaterNub] = useAtom(SelectedWaterNub);
    const setActiveView = useSetAtom(ActiveView);
    const globals = useAtomValue(Globals);
    const waterBody = liquidData.Liqd[1000].obj[waterBodyIdx];
    const [initialDragState, setInitialDragState] = useState<
      [number, number][] | null
    >(null);
    const lineRef = useRef<Konva.Line | null>(null);
    /** Mutable preview nub positions during drag — updated imperatively to avoid per-frame state. */
    const previewNubsRef = useRef<[number, number][] | null>(null);

    const bodyCanvas = useMemo(
      () =>
        waterBody
          ? buildLiquidBodyCanvas(globals, headerData, terrainData, waterBody)
          : null,
      [globals, headerData, terrainData, waterBody],
    );

    if (!waterBody) return <></>;

    const visibleNubs = cloneVisibleWaterNubs(
      waterBody.nubs,
      waterBody.numNubs,
    );
    const waterNubs = visibleNubs.flatMap((nub) => [nub[0], nub[1]]);
    const style = getLiquidVisualStyle(globals, waterBody.type);

    return (
      <>
        {bodyCanvas && (
          <KonvaImage
            image={bodyCanvas.canvas}
            x={bodyCanvas.x}
            y={bodyCanvas.y}
            listening={false}
            perfectDrawEnabled={false}
          />
        )}
        <Line
          ref={lineRef}
          points={waterNubs}
          stroke={
            waterBodyIdx === selectedWaterBody ? "#dce2ff" : style.strokeColor
          }
          strokeWidth={waterBodyIdx === selectedWaterBody ? 5 : 2}
          perfectDrawEnabled={false}
          hitStrokeWidth={10}
          onClick={() => {
            selectWaterBody({
              waterBodyIdx,
              setSelectedWaterBody,
              setActiveView,
            });
          }}
          closed
          fill={waterBodyIdx === selectedWaterBody ? "#9999FF08" : "#9999FF04"}
          draggable
          onDragStart={() => {
            const body = liquidData.Liqd[1000].obj[waterBodyIdx];
            if (!body) return;
            setInitialDragState(cloneVisibleWaterNubs(body.nubs, body.numNubs));
            selectWaterBody({
              waterBodyIdx,
              setSelectedWaterBody,
              setActiveView,
            });
          }}
          onDragMove={() => {
            // No per-frame state updates — let Konva handle visuals while dragging.
          }}
          onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
            if (!initialDragState) return;

            const dragDx = e.target.x();
            const dragDz = e.target.y();

            applyDraggedBodyOffset(
              setLiquidData,
              waterBodyIdx,
              initialDragState,
              dragDx,
              dragDz,
            );
            e.target.x(0);
            e.target.y(0);
            setInitialDragState(null);
          }}
        />
        {waterBodyIdx === selectedWaterBody &&
          waterBody.nubs.map((nub, nubIdx) => {
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
                  selectWaterNub({
                    waterBodyIdx,
                    nubIdx,
                    setSelectedWaterBody,
                    setActiveView,
                    setSelectedWaterNub,
                  });
                }}
                onDragStart={() => {
                  selectWaterNub({
                    waterBodyIdx,
                    nubIdx,
                    setSelectedWaterBody,
                    setActiveView,
                    setSelectedWaterNub,
                  });
                  previewNubsRef.current = cloneVisibleWaterNubs(
                    waterBody.nubs,
                    waterBody.numNubs,
                  );
                }}
                onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
                  const newX = Math.round(e.target.x());
                  const newY = Math.round(e.target.y());
                  if (!previewNubsRef.current) return;
                  const preview = updatePreviewNub(
                    previewNubsRef.current,
                    nubIdx,
                    newX,
                    newY,
                  );
                  drawPreviewLine(lineRef.current, preview);
                }}
                onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
                  previewNubsRef.current = null;
                  commitWaterNubPosition(
                    setLiquidData,
                    waterBodyIdx,
                    nubIdx,
                    e.target.x(),
                    e.target.y(),
                  );
                }}
              />
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
              commitWaterHotspotPosition(
                setLiquidData,
                waterBodyIdx,
                e.target.x(),
                e.target.y(),
              )
            }
          />
        )}
      </>
    );
  },
);
