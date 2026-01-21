/**
 * Nanosaur Editor View
 * 
 * For Nanosaur 1 which uses individual tiles but has minimal features:
 * - No fences
 * - No water bodies
 * - No splines
 * - Just items and terrain
 */

import { useState, useEffect, useMemo } from "react";
import { Nanosaur1EditorToolbar } from "../toolbars/Nanosaur1EditorToolbar";
import { Updater, useImmer } from "use-immer";
import { useAtomValue } from "jotai";
import { CanvasView, CanvasViewMode } from "@/data/canvasView/canvasViewAtoms";

import { ItemMenu } from "../subviews/items/ItemMenu";
import { IndividualTilesMenu } from "./IndividualTilesMenu";
import { BugdomTileMenu } from "../subviews/bugdom/BugdomTileMenu";
import { Nanosaur1KonvaView } from "../canvas/Nanosaur1KonvaView";
import { CanvasOverlay } from "../subviews/filters/CanvasOverlay";
import { ThreeView } from "../threejs/Three";
import { View } from "../viewEnum";
import {
  createNonNullUpdater,
  createUndoRedoKeyHandler,
  createZoomInHandler,
  createZoomOutHandler,
  terrainHasSupertileData,
} from "../utils/editorViewUtils";
import type { NanosaurEditorViewProps } from "../utils/editorViewTypes";
import {
  ItemData,
} from "@/python/structSpecs/LevelTypes";

export function NanosaurEditorView({
  headerData,
  setHeaderData,
  itemData,
  setItemData,
  terrainData,
  setTerrainData,
  mapImages,
  setMapImages,
  undoData,
  redoData,
  dataHistory,
}: NanosaurEditorViewProps) {
  const canvasViewMode = useAtomValue(CanvasViewMode);
  // Default to items view since Nanosaur doesn't have fences
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

  const showSupertileMenu = terrainHasSupertileData(terrainData);

  return (
    <div className="flex flex-col flex-1 w-full gap-2 min-h-0">
      <Nanosaur1EditorToolbar
        view={view}
        setView={setView}
        undoData={undoData}
        redoData={redoData}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        dataHistoryIndex={dataHistory.index}
        dataHistoryLength={dataHistory.items.length}
        terrainHasSTgd={showSupertileMenu}
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
        {view === View.tiles && canvasViewMode !== CanvasView.THREE_D && (
          <IndividualTilesMenu headerData={headerData} setHeaderData={setHeaderData} />
        )}
        {view === View.supertiles && showSupertileMenu && (
          <BugdomTileMenu
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
        <CanvasOverlay itemData={itemData} />
        {canvasViewMode === CanvasView.THREE_D && view === View.tiles ? (
          <ThreeView
            headerData={headerData}
            fenceData={null}
            liquidData={null}
            itemData={itemData}
            splineData={null}
            terrainData={terrainData}
            mapImages={mapImages}
          />
        ) : (
          <Nanosaur1KonvaView
            headerData={headerData}
            itemData={itemData}
            setItemData={setItemData}
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
