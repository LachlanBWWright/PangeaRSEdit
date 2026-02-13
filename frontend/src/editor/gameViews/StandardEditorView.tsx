/**
 * Standard Editor View
 * 
 * For games with standard supertile-based terrain (Bugdom 2, Nanosaur 2, Cro-Mag, Billy Frontier)
 * Has all standard features but no game-specific options like Electric Floor
 */

import { useState, useEffect, useMemo } from "react";
import { StandardEditorToolbar } from "../toolbars/StandardEditorToolbar";
import { Updater, useImmer } from "use-immer";
import { useAtomValue } from "jotai";
import { CanvasView, CanvasViewMode } from "@/data/canvasView/canvasViewAtoms";

import { FenceMenu } from "../subviews/fences/FenceMenu";
import { ItemMenu } from "../subviews/items/ItemMenu";
import { SplineMenu } from "../subviews/splines/SplineMenu";
import { WaterMenu } from "../subviews/water/WaterMenu";
import { StandardTilesMenu } from "./StandardTilesMenu";
import { SupertileMenu } from "../subviews/supertiles/SupertilesMenu";
import { StandardKonvaView } from "../canvas/StandardKonvaView";
import { ThreeView } from "../threejs/Three";
import { View } from "../viewEnum";
import { ItemFilterToggle } from "../subviews/filters/ItemFilterToggle";
import {
  createNonNullUpdater,
  createUndoRedoKeyHandler,
  createZoomInHandler,
  createZoomOutHandler,
  terrainHasSupertileData,
} from "../utils/editorViewUtils";
import { applyResizeToAtomicData } from "../utils/levelResizeHandlers";
import { Globals } from "@/data/globals/globals";
import type { EditorViewProps } from "../utils/editorViewTypes";
import {
  ItemData,
  LiquidData,
  FenceData,
  SplineData,
} from "@/python/structSpecs/LevelTypes";

export function StandardEditorView({
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
}: EditorViewProps) {
  const canvasViewMode = useAtomValue(CanvasViewMode);
  const globals = useAtomValue(Globals);
  const [view, setView] = useState<View>(View.fences);
  const [stage, setStage] = useImmer({ scale: 1, x: 0, y: 0 });

  const handleKeyDown = useMemo(
    () => createUndoRedoKeyHandler(undoData, redoData),
    [undoData, redoData]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const zoomIn = useMemo(() => createZoomInHandler(setStage), [setStage]);
  const zoomOut = useMemo(() => createZoomOutHandler(setStage), [setStage]);

  const setItemDataNotNull: Updater<ItemData> = useMemo(
    () => createNonNullUpdater(setItemData),
    [setItemData]
  );
  const setLiquidDataNotNull: Updater<LiquidData> = useMemo(
    () => createNonNullUpdater(setLiquidData),
    [setLiquidData]
  );
  const setFenceDataNotNull: Updater<FenceData> = useMemo(
    () => createNonNullUpdater(setFenceData),
    [setFenceData]
  );
  const setSplineDataNotNull: Updater<SplineData> = useMemo(
    () => createNonNullUpdater(setSplineData),
    [setSplineData]
  );

  const showSupertileMenu = terrainHasSupertileData(terrainData);
  const handleResize = (direction: "top" | "bottom" | "left" | "right", tileCount: number) => {
    const result = applyResizeToAtomicData(
      {
        headerData,
        itemData,
        liquidData,
        fenceData,
        splineData,
        terrainData,
      },
      globals,
      {
        direction,
        tileCount,
        defaultHeight: headerData.Hedr[1000].obj.minY ?? 0,
      },
    );
    if (result.isErr()) {
      console.error("Failed to resize level:", result.error.message);
      return;
    }
    const resized = result.value.data;
    if (resized.headerData) setHeaderData(resized.headerData);
    if (resized.itemData !== undefined) setItemData(resized.itemData);
    if (resized.liquidData !== undefined) setLiquidData(resized.liquidData);
    if (resized.fenceData !== undefined) setFenceData(resized.fenceData);
    if (resized.splineData !== undefined) setSplineData(resized.splineData);
    if (resized.terrainData) setTerrainData(resized.terrainData);
  };

  return (
    <div className="flex flex-col flex-1 w-full gap-2 min-h-0">
      <StandardEditorToolbar
        view={view}
        setView={setView}
        undoData={undoData}
        redoData={redoData}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        dataHistoryIndex={dataHistory.index}
        dataHistoryLength={dataHistory.items.length}
        terrainHasSTgd={showSupertileMenu}
        hasFenceData={fenceData !== null}
        hasLiquidData={liquidData !== null}
      />
      <div>
        {view === View.fences && fenceData && (
          <FenceMenu fenceData={fenceData} setFenceData={setFenceDataNotNull} />
        )}
        {view === View.water && liquidData && (
          <WaterMenu liquidData={liquidData} setLiquidData={setLiquidDataNotNull} />
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
          <StandardTilesMenu
            headerData={headerData}
            setHeaderData={setHeaderData}
            onResize={handleResize}
          />
        )}
        {view === View.supertiles && showSupertileMenu && (
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
      <div className="w-full min-h-0 flex-1 border-2 border-black overflow-clip relative">
        {/* Item Filter Toggle - Top Right */}
        {itemData && (
          <div className="absolute top-2 right-2 z-10">
            <ItemFilterToggle />
          </div>
        )}
        {canvasViewMode === CanvasView.THREE_D && view === View.tiles ? (
          <ThreeView
            headerData={headerData}
            fenceData={fenceData}
            liquidData={liquidData}
            itemData={itemData}
            splineData={splineData}
            terrainData={terrainData}
            mapImages={mapImages}
          />
        ) : (
          <StandardKonvaView
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
