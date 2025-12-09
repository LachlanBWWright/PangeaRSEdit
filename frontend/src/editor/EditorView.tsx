import { useState, useEffect, useCallback } from "react";
import { EditorToolbar } from "./EditorToolbar";
import {
  HeaderData,
  ItemData,
  LiquidData,
  FenceData,
  SplineData,
  TerrainData,
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

import View from "./viewEnum";

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
  terrainData,
  setTerrainData,
  mapImages,
  setMapImages,
  undoData,
  redoData,
  dataHistory,
}: {
  headerData: HeaderData;
  setHeaderData: Updater<HeaderData>;
  itemData: ItemData | null;
  setItemData: Updater<ItemData | null>;
  liquidData: LiquidData | null;
  setLiquidData: Updater<LiquidData | null>;
  fenceData: FenceData | null;
  setFenceData: Updater<FenceData | null>;
  splineData: SplineData | null;
  setSplineData: Updater<SplineData | null>;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  mapImages: HTMLCanvasElement[];
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void;
  undoData: () => void;
  redoData: () => void;
  dataHistory: DataHistory;
}) {
  console.log(
    headerData,
    itemData,
    liquidData,
    fenceData,
    splineData,
    terrainData,
  );
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

  // Provide non-null Updater wrappers for menus that expect non-null data
  const setItemDataNotNull: Updater<ItemData> = useCallback(
    (updater) => {
      setItemData((current) => {
        if (!current) return current;
        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    [setItemData],
  );

  const setLiquidDataNotNull: Updater<LiquidData> = useCallback(
    (updater) => {
      setLiquidData((current) => {
        if (!current) return current;
        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    [setLiquidData],
  );

  const setFenceDataNotNull: Updater<FenceData> = useCallback(
    (updater) => {
      setFenceData((current) => {
        if (!current) return current;
        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    [setFenceData],
  );

  const setSplineDataNotNull: Updater<SplineData> = useCallback(
    (updater) => {
      setSplineData((current) => {
        if (!current) return current;
        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    [setSplineData],
  );

  return (
    <div className="flex flex-col flex-1 w-full gap-2 min-h-0">
      <EditorToolbar
        view={view}
        setView={setView}
        undoData={undoData}
        redoData={redoData}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        dataHistoryIndex={dataHistory.index}
        dataHistoryLength={dataHistory.items.length}
        terrainHasSTgd={
          terrainData &&
          // For Bugdom 1: has Layr (tile layer data), for other games: has STgd
          ((terrainData.STgd !== undefined && terrainData.STgd !== null) ||
            (terrainData.Layr !== undefined && terrainData.Layr !== null))
        }
        hasFenceData={fenceData !== null}
        hasLiquidData={liquidData !== null}
      />
      <div>
        {view === View.fences && fenceData && (
          <FenceMenu fenceData={fenceData} setFenceData={setFenceDataNotNull} />
        )}
        {view === View.water && liquidData && (
          <WaterMenu
            liquidData={liquidData}
            setLiquidData={setLiquidDataNotNull}
          />
        )}
        {view === View.items && itemData && (
          <ItemMenu
            itemData={itemData}
            setItemData={setItemDataNotNull}
            headerData={headerData}
            setHeaderData={setHeaderData}
          />
        )}
        {view === View.splines && splineData && (
          <SplineMenu
            splineData={splineData}
            setSplineData={setSplineDataNotNull}
            headerData={headerData}
            setHeaderData={setHeaderData}
          />
        )}
        {view === View.tiles && (
          <TilesMenu headerData={headerData} setHeaderData={setHeaderData} />
        )}
        {view === View.supertiles && (
          <SupertileMenu
            headerData={headerData}
            setHeaderData={setHeaderData}
            terrainData={terrainData}
            setTerrainData={setTerrainData}
            mapImages={mapImages}
            setMapImages={setMapImages}
          />
        )}
      </div>
      <div className="w-full min-h-0 flex-1 border-2 border-black overflow-clip">
        {canvasViewMode === CanvasView.THREE_D && view === View.tiles ? (
          <ThreeView
            headerData={headerData}
            fenceData={fenceData}
            liquidData={liquidData}
            terrainData={terrainData}
            mapImages={mapImages}
          />
        ) : (
          <KonvaView
            headerData={headerData}
            itemData={itemData}
            setItemData={setItemData}
            liquidData={liquidData}
            setLiquidData={setLiquidData}
            fenceData={fenceData}
            setFenceData={setFenceData}
            splineData={splineData}
            setSplineData={setSplineData}
            terrainData={terrainData}
            setTerrainData={setTerrainData}
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
