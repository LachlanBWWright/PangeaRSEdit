import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ottoMaticLevel } from "../python/structSpecs/ottoMaticInterface";
import {
  HeaderData,
  ItemData,
  LiquidData,
  FenceData,
  SplineData,
} from "../python/structSpecs/ottoMaticLevelData";
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
  headerData,
  setHeaderData,
  itemData,
  setItemData,
  liquidData,
  setLiquidData,
  fenceData,
  setFenceData,
  splineData,
  setSplineData,
  otherData,
  setOtherData,
  mapImages,
  setMapImages,
  undoData,
  redoData,
  dataHistory,
}: {
  headerData: HeaderData;
  setHeaderData: Updater<HeaderData>;
  itemData: ItemData;
  setItemData: Updater<ItemData>;
  liquidData: LiquidData;
  setLiquidData: Updater<LiquidData>;
  fenceData: FenceData;
  setFenceData: Updater<FenceData>;
  splineData: SplineData;
  setSplineData: Updater<SplineData>;
  otherData: Partial<ottoMaticLevel>;
  setOtherData: Updater<Partial<ottoMaticLevel>>;
  mapImages: HTMLCanvasElement[];
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void;
  undoData: () => void;
  redoData: () => void;
  dataHistory: DataHistory;
}) {
  console.log(headerData, itemData, liquidData, fenceData, splineData, otherData);
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
          disabled={otherData.STgd === undefined}
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
        {view === View.fences && <FenceMenu fenceData={fenceData} setFenceData={setFenceData} />}
        {view === View.water && <WaterMenu liquidData={liquidData} setLiquidData={setLiquidData} />}
        {view === View.items && <ItemMenu itemData={itemData} setItemData={setItemData} headerData={headerData} setHeaderData={setHeaderData} />}
        {view === View.splines && <SplineMenu splineData={splineData} setSplineData={setSplineData} headerData={headerData} setHeaderData={setHeaderData} />}
        {view === View.tiles && <TilesMenu otherData={otherData} setOtherData={setOtherData} />}
        {view === View.supertiles && (
          <SupertileMenu
            otherData={otherData}
            setOtherData={setOtherData}
            mapImages={mapImages}
            setMapImages={setMapImages}
          />
        )}
      </div>
      <div className="w-full min-h-0 flex-1 border-2 border-black overflow-clip">
        {canvasViewMode === CanvasView.THREE_D && view === View.tiles ? (
          <ThreeView otherData={otherData} mapImages={mapImages} />
        ) : (
          <KonvaView
            headerData={headerData}
            setHeaderData={setHeaderData}
            itemData={itemData}
            setItemData={setItemData}
            liquidData={liquidData}
            setLiquidData={setLiquidData}
            fenceData={fenceData}
            setFenceData={setFenceData}
            splineData={splineData}
            setSplineData={setSplineData}
            otherData={otherData}
            setOtherData={setOtherData}
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
