import { useRef, useState } from "react";
import { Button, ZoomButton } from "../components/Button";
import { ottoMaticLevel } from "../python/structSpecs/ottoMaticInterface";
import { Fences } from "./subviews/Fences";
import { Stage } from "react-konva";
import { Updater, useImmer } from "use-immer";

import { FenceMenu } from "./subviews/fences/FenceMenu";
import { useAtomValue, useSetAtom } from "jotai";
import { SelectedFence } from "../data/fences/fenceAtoms";
import { Items } from "./subviews/Items";
import { ItemMenu } from "./subviews/items/ItemMenu";
import { Splines } from "./subviews/Splines";
import { SplineMenu } from "./subviews/splines/SplineMenu";
import { ClickToAddItem, SelectedItem } from "../data/items/itemAtoms";
import { SelectedSpline } from "../data/splines/splineAtoms";
import { WaterBodies } from "./subviews/WaterBodies";
import { WaterMenu } from "./subviews/water/WaterMenu";
import { SelectedWaterBody } from "../data/water/waterAtoms";
import { Tiles } from "./subviews/Tiles";
import { TilesMenu } from "./subviews/tiles/TilesMenu";
import { Supertiles } from "./subviews/Supertiles";
import { SupertileMenu } from "./subviews/supertiles/SupertilesMenu";
import { DataHistory } from "./MapPrompt";

enum View {
  fences,
  water,
  items,
  splines,
  tiles,
  supertiles,
}

export function EditorView({
  data,
  setData,
  mapImages,
  setMapImages,
  undoData,
  redoData,
  dataHistory,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  mapImages: HTMLCanvasElement[];
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void;
  undoData: () => void;
  redoData: () => void;
  dataHistory: DataHistory;
}) {
  console.log(data);

  const [view, setView] = useState<View>(View.fences);
  const [stage, setStage] = useImmer({
    scale: 1,
    x: 0,
    y: 0,
  });
  const setSelectedFence = useSetAtom(SelectedFence);
  const setSelectedItem = useSetAtom(SelectedItem);
  const setSelectedSpline = useSetAtom(SelectedSpline);
  const setSelectedWaterBody = useSetAtom(SelectedWaterBody);
  const clickToAddItem = useAtomValue(ClickToAddItem);
  const zoomIn = () =>
    setStage((stage) => {
      stage.scale = Math.max(0.1, stage.scale * 1.1);
    });
  const zoomOut = () =>
    setStage((stage) => {
      stage.scale = Math.min(5, stage.scale * 0.9);
    });

  const stageRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col flex-1 w-full gap-2 min-h-0">
      <div className="grid grid-cols-4 xl:grid-cols-7 gap-2 w-full overflow-clip">
        <Button
          selected={view === View.fences}
          onClick={() => setView(View.fences)}
        >
          Fences
        </Button>
        <Button
          selected={view === View.water}
          onClick={() => setView(View.water)}
        >
          Water
        </Button>
        <Button
          selected={view === View.items}
          onClick={() => setView(View.items)}
        >
          Items
        </Button>
        <Button
          selected={view === View.splines}
          onClick={() => setView(View.splines)}
        >
          Splines
        </Button>
        <Button
          selected={view === View.tiles}
          onClick={() => setView(View.tiles)}
        >
          Tiles
        </Button>
        <Button
          disabled={data.STgd === undefined}
          selected={view === View.supertiles}
          onClick={() => setView(View.supertiles)}
        >
          Supertiles
        </Button>
        <div className="grid col-span-2 xl:col-span-1 grid-cols-4 gap-2">
          <ZoomButton disabled={dataHistory.index === 0} onClick={undoData}>
            ↩
          </ZoomButton>
          <ZoomButton
            disabled={dataHistory.index === dataHistory.items.length - 1}
            onClick={redoData}
          >
            ↪
          </ZoomButton>

          <ZoomButton onClick={zoomOut}>-</ZoomButton>
          <ZoomButton onClick={zoomIn}>+</ZoomButton>
        </div>
      </div>
      <div>
        {view === View.fences && <FenceMenu data={data} setData={setData} />}
        {view === View.water && <WaterMenu data={data} setData={setData} />}
        {view === View.items && <ItemMenu data={data} setData={setData} />}
        {view === View.splines && <SplineMenu data={data} setData={setData} />}
        {view === View.tiles && <TilesMenu />}
        {view === View.supertiles && (
          <SupertileMenu
            data={data}
            setData={setData}
            mapImages={mapImages}
            setMapImages={setMapImages}
          />
        )}
      </div>
      <div
        className="w-full min-h-0 flex-1 border-2 border-black overflow-clip"
        ref={stageRef}
      >
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
      </div>
    </div>
  );
}
