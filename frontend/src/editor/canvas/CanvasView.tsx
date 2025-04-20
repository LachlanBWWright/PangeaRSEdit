import { SelectedFence } from "@/data/fences/fenceAtoms";
import { ClickToAddItem, SelectedItem } from "@/data/items/itemAtoms";
import { SelectedSpline } from "@/data/splines/splineAtoms";
import { SelectedWaterBody } from "@/data/water/waterAtoms";
import { useAtomValue, useSetAtom } from "jotai";
import { useRef } from "react";
import { Stage } from "react-konva";
import { Updater } from "use-immer";
import { Items } from "../subviews/Items";
import { Fences } from "../subviews/Fences";
import { Splines } from "../subviews/Splines";
import { WaterBodies } from "../subviews/WaterBodies";
import { Tiles } from "../subviews/Tiles";
import { Supertiles } from "../subviews/Supertiles";
import { ottoMaticLevel } from "@/python/structSpecs/ottoMaticInterface";

enum View {
  fences,
  water,
  items,
  splines,
  tiles,
  supertiles,
}

export type StageData = {
  scale: number;
  x: number;
  y: number;
};

export function CanvasView({
  data,
  setData,
  mapImages,
  view,
  stage,
  setStage,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  mapImages: HTMLCanvasElement[];
  view: View;
  stage: StageData;
  setStage: Updater<StageData>;
}) {
  const setSelectedFence = useSetAtom(SelectedFence);
  const setSelectedItem = useSetAtom(SelectedItem);
  const setSelectedSpline = useSetAtom(SelectedSpline);
  const setSelectedWaterBody = useSetAtom(SelectedWaterBody);
  const clickToAddItem = useAtomValue(ClickToAddItem);

  const stageRef = useRef<HTMLDivElement>(null);

  return (
    <Stage
      width={stageRef.current?.offsetWidth ?? 3000}
      height={stageRef.current?.offsetHeight ?? 2000}
      scaleX={stage.scale}
      scaleY={stage.scale}
      x={stage.x}
      y={stage.y}
      draggable={true}
      onClick={(e) => {
        if (clickToAddItem === undefined) return;
        const stage = e.target.getStage();

        const pos = stage?.getRelativePointerPosition();
        if (!pos) return;
        const x = Math.round(pos.x);
        const z = Math.round(pos.y);

        setData((data) => {
          data.Itms[1000].obj.push({
            x: x,
            z: z,
            type: clickToAddItem,
            flags: 0,
            p0: 0,
            p1: 0,
            p2: 0,
            p3: 0,
          });
        });
      }}
      onDblClick={() => {
        setSelectedFence(undefined);
        setSelectedItem(undefined);
        setSelectedSpline(undefined);
        setSelectedWaterBody(undefined);
      }}
      onWheel={(e) => {
        /*from https://stackoverflow.com/questions/52054848/how-to-react-konva-zooming-on-scroll */
        e.evt.preventDefault();

        const scaleBy = 1.05;
        const stage = e.target.getStage();
        if (!stage) return;
        const oldScale = stage.scaleX();
        const pointerPosition = stage.getPointerPosition();
        if (!pointerPosition) return;

        const mousePointTo = {
          x: pointerPosition.x / oldScale - stage.x() / oldScale,
          y: pointerPosition.y / oldScale - stage.y() / oldScale,
        };

        const newScale =
          e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

        setStage({
          scale: newScale,
          x: (pointerPosition.x / newScale - mousePointTo.x) * newScale,
          y: (pointerPosition.y / newScale - mousePointTo.y) * newScale,
        });
      }}
    >
      {data.STgd && <Supertiles data={data} mapImages={mapImages} />}
      {view === View.tiles && (
        <Tiles
          data={data}
          setData={setData}
          isEditingTopology={view === View.tiles}
        />
      )}
      {view === View.tiles ||
        (view === View.supertiles && (
          <>
            <WaterBodies data={data} setData={setData} />
            <Fences data={data} setData={setData} />
            <Items data={data} setData={setData} />
            <Splines data={data} setData={setData} />
          </>
        ))}
      {view === View.fences && (
        <>
          <WaterBodies data={data} setData={setData} />
          <Items data={data} setData={setData} />
          <Splines data={data} setData={setData} />
          <Fences data={data} setData={setData} />
        </>
      )}
      {view === View.water && (
        <>
          <Fences data={data} setData={setData} />
          <Items data={data} setData={setData} />
          <Splines data={data} setData={setData} />
          <WaterBodies data={data} setData={setData} />
        </>
      )}
      {view === View.splines && (
        <>
          <WaterBodies data={data} setData={setData} />
          <Items data={data} setData={setData} />
          <Fences data={data} setData={setData} />
          <Splines data={data} setData={setData} />
        </>
      )}
      {view === View.items && (
        <>
          <WaterBodies data={data} setData={setData} />
          <Splines data={data} setData={setData} />
          <Fences data={data} setData={setData} />
          <Items data={data} setData={setData} />
        </>
      )}
    </Stage>
  );
}
