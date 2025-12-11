/**
 * Mighty Mike Editor View
 * 
 * For Mighty Mike which uses individual tiles:
 * - Items
 * - Terrain tiles
 * - No fences, water bodies, or splines
 */

import { useState, useEffect, useMemo } from "react";
import { EditorToolbar } from "../EditorToolbar";
import { Updater, useImmer } from "use-immer";
import { useAtomValue } from "jotai";
import { CanvasView, CanvasViewMode } from "@/data/canvasView/canvasViewAtoms";

import { ItemMenu } from "../subviews/items/ItemMenu";
import { IndividualTilesMenu } from "./IndividualTilesMenu";
import { KonvaView } from "../canvas/CanvasView";
import { ThreeView } from "../threejs/Three";
import { View } from "../viewEnum";
import {
  createNonNullUpdater,
  createUndoRedoKeyHandler,
  createZoomInHandler,
  createZoomOutHandler,
} from "../utils/editorViewUtils";
import type { MightyMikeEditorViewProps } from "../utils/editorViewTypes";
import {
  ItemData,
} from "@/python/structSpecs/LevelTypes";

export function MightyMikeEditorView({
  headerData,
  setHeaderData,
  itemData,
  setItemData,
  terrainData,
  setTerrainData,
  mapImages,
  undoData,
  redoData,
  dataHistory,
}: MightyMikeEditorViewProps) {
  const canvasViewMode = useAtomValue(CanvasViewMode);
  // Default to items view since MightyMike doesn't have fences
  const [view, setView] = useState<View>(View.items);
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
        terrainHasSTgd={false} // MightyMike doesn't have supertiles
        hasFenceData={false} // MightyMike doesn't have fences
        hasLiquidData={false} // MightyMike doesn't have water bodies
      />
      <div>
        {view === View.items && itemData && (
          <ItemMenu
            itemData={itemData}
            setItemData={setItemDataNotNull}
            headerData={headerData}
            setHeaderData={setHeaderData}
          />
        )}
        {view === View.tiles && (
          <IndividualTilesMenu headerData={headerData} setHeaderData={setHeaderData} />
        )}
      </div>
      <div className="w-full min-h-0 flex-1 border-2 border-black overflow-clip">
        {canvasViewMode === CanvasView.THREE_D && view === View.tiles ? (
          <ThreeView
            headerData={headerData}
            fenceData={null}
            liquidData={null}
            terrainData={terrainData}
            mapImages={mapImages}
          />
        ) : (
          <KonvaView
            headerData={headerData}
            itemData={itemData}
            setItemData={setItemData}
            liquidData={null}
            setLiquidData={() => {}} // No-op for MightyMike
            fenceData={null}
            setFenceData={() => {}} // No-op for MightyMike
            splineData={null}
            setSplineData={() => {}} // No-op for MightyMike
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
