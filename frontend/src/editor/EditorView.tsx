import { useState } from "react";
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
import { TopologyGrid } from "./subviews/TopologyGrid";
import { TopologyMenu } from "./subviews/topology/TopologyMenu";
import { Tiles } from "./subviews/Tiles";
import { TileMenu } from "./subviews/tiles/TilesMenu";

enum View {
  fences,
  water,
  items,
  splines,
  topology,
  tiles,
}

export function EditorView({
  data,
  setData,
  mapImages,
  setMapImages,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  mapImages: HTMLCanvasElement[];
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void;
}) {
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
  console.log(data);
  const zoomIn = () =>
    setStage((stage) => {
      stage.scale = Math.max(0.1, stage.scale * 1.1);
    });
  const zoomOut = () =>
    setStage((stage) => {
      stage.scale = Math.min(5, stage.scale * 0.9);
    });

  return (
    <div className="flex flex-col flex-1 w-full gap-2 min-h-0">
      <div className="grid grid-cols-7 gap-2 w-full overflow-clip">
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
          selected={view === View.topology}
          onClick={() => setView(View.topology)}
        >
          Topology
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <ZoomButton onClick={zoomIn}>Zoom In</ZoomButton>
          <ZoomButton onClick={zoomOut}>Zoom Out</ZoomButton>
        </div>
      </div>
      <div>
        {view === View.fences && <FenceMenu data={data} setData={setData} />}
        {view === View.water && <WaterMenu data={data} setData={setData} />}
        {view === View.items && <ItemMenu data={data} setData={setData} />}
        {view === View.splines && <SplineMenu data={data} setData={setData} />}
        {view === View.tiles && (
          <TileMenu
            data={data}
            setData={setData}
            mapImages={mapImages}
            setMapImages={setMapImages}
          />
        )}
        {view === View.topology && <TopologyMenu />}
      </div>
      <Stage
        width={2000}
        height={2000}
        scaleX={stage.scale}
        scaleY={stage.scale}
        x={stage.x}
        y={stage.y}
        draggable={true}
        onClick={(e) => {
          console.log("TEST");
          if (clickToAddItem === undefined) return;
          const stage = e.target.getStage();

          const pos = stage?.getRelativePointerPosition();
          if (!pos) return;
          const x = Math.round(pos.x);
          const z = Math.round(pos.y);
          console.log("SETDATA", x, z);
          console.log(data.Itms[1000].obj);
          console.log(data.Itms[1000].obj.length);

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
        className="w-full min-h-0 flex-1 border-2 border-black overflow-clip"
      >
        {view === View.topology ? (
          <TopologyGrid
            data={data}
            setData={setData}
            isEditingTopology={view === View.topology}
          />
        ) : (
          <Tiles data={data} mapImages={mapImages} />
        )}
        {view === View.topology ||
          (view === View.tiles && (
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
  );
}
