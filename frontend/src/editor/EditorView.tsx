import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ottoMaticLevel } from "../python/structSpecs/ottoMaticInterface";
import { Updater, useImmer } from "use-immer";

import { FenceMenu } from "./subviews/fences/FenceMenu";
import { ItemMenu } from "./subviews/items/ItemMenu";
import { SplineMenu } from "./subviews/splines/SplineMenu";
import { WaterMenu } from "./subviews/water/WaterMenu";

import { TilesMenu } from "./subviews/tiles/TilesMenu";
import { SupertileMenu } from "./subviews/supertiles/SupertilesMenu";
import { DataHistory } from "./IntroPrompt";
import { KonvaView } from "./canvas/CanvasView";
import { ThreeView } from "./threejs/Three";
import { useAtomValue } from "jotai";
import { CanvasView, CanvasViewMode } from "@/data/canvasView/canvasViewAtoms";
import { Separator } from "@/components/ui/separator";

export enum View {
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
  const canvasViewMode = useAtomValue(CanvasViewMode);
  const [view, setView] = useState<View>(View.fences);
  const [stage, setStage] = useImmer({
    scale: 1,
    x: 0,
    y: 0,
  });

  // Keyboard listeners for undo/redo
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        (e.key === "z" || e.key === "Z")
      ) {
        e.preventDefault();
        undoData();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.shiftKey && (e.key === "z" || e.key === "Z")))
      ) {
        e.preventDefault();
        redoData();
      }
    },
    [undoData, redoData],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

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
          <Button
            variant="zoom"
            disabled={dataHistory.index === 0}
            onClick={undoData}
          >
            ↩
          </Button>
          <Button
            variant="zoom"
            disabled={dataHistory.index === dataHistory.items.length - 1}
            onClick={redoData}
          >
            ↪
          </Button>

          <Button variant="zoom" onClick={zoomOut}>
            -
          </Button>
          <Button variant="zoom" onClick={zoomIn}>
            +
          </Button>
        </div>
      </div>
      <Separator />
      <div>
        {view === View.fences && <FenceMenu data={data} setData={setData} />}
        {view === View.water && <WaterMenu data={data} setData={setData} />}
        {view === View.items && <ItemMenu data={data} setData={setData} />}
        {view === View.splines && <SplineMenu data={data} setData={setData} />}
        {view === View.tiles && <TilesMenu data={data} setData={setData} />}
        {view === View.supertiles && (
          <SupertileMenu
            data={data}
            setData={setData}
            mapImages={mapImages}
            setMapImages={setMapImages}
          />
        )}
      </div>
      <div className="w-full min-h-0 flex-1 border-2 border-black overflow-clip">
        {canvasViewMode === CanvasView.THREE_D && view === View.tiles ? (
          <ThreeView data={data} mapImages={mapImages} />
        ) : (
          <KonvaView
            data={data}
            setData={setData}
            mapImages={mapImages}
            view={view}
            stage={stage}
            setStage={setStage}
          />
        )}
      </div>
    </div>
  );
}
