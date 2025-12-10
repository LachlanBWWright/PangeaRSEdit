/**
 * Otto Matic Editor View
 * 
 * Complete editor view for Otto Matic with all features:
 * - Fences, water, items, splines
 * - Electric floor tile options
 * - 3D terrain view
 */

import { useState, useEffect, useMemo } from "react";
import { EditorToolbar } from "../EditorToolbar";
import { Updater, useImmer } from "use-immer";
import { useAtomValue } from "jotai";
import { CanvasView, CanvasViewMode } from "@/data/canvasView/canvasViewAtoms";

import { FenceMenu } from "../subviews/fences/FenceMenu";
import { ItemMenu } from "../subviews/items/ItemMenu";
import { SplineMenu } from "../subviews/splines/SplineMenu";
import { WaterMenu } from "../subviews/water/WaterMenu";
import { OttoMaticTilesMenu } from "./OttoMaticTilesMenu";
import { SupertileMenu } from "../subviews/supertiles/SupertilesMenu";
import { KonvaView } from "../canvas/CanvasView";
import { ThreeView } from "../threejs/Three";
import { View } from "../viewEnum";
import {
  createNonNullUpdater,
  createUndoRedoKeyHandler,
  createZoomInHandler,
  createZoomOutHandler,
  terrainHasSupertileData,
} from "../utils/editorViewUtils";
import type { EditorViewProps } from "../utils/editorViewTypes";
import {
  ItemData,
  LiquidData,
  FenceData,
  SplineData,
} from "@/python/structSpecs/LevelTypes";

export function OttoMaticEditorView({
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
          <OttoMaticTilesMenu headerData={headerData} setHeaderData={setHeaderData} />
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
