/**
 * Mighty Mike Editor View
 * 
 * For Mighty Mike which uses individual tiles:
 * - Items
 * - Terrain tiles
 * - No fences, water bodies, or splines
 */

import { useState, useEffect, useMemo } from "react";
import { useImmer, Updater } from "use-immer";
import { MightyMikeEditorToolbar } from "../toolbars/MightyMikeEditorToolbar";

import { MightyMikeItemMenu } from "../subviews/items/MightyMikeItemMenu";
import { MightyMikeTileMenu } from "../subviews/mightymike/MightyMikeTileMenu";
import { MightyMikeKonvaView } from "../canvas/MightyMikeKonvaView";
import { View } from "../viewEnum";
import { ItemFilterToggle } from "../subviews/filters/ItemFilterToggle";
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
  setMapImages,
  undoData,
  redoData,
  dataHistory,
}: MightyMikeEditorViewProps) {
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
      <MightyMikeEditorToolbar
        view={view}
        setView={setView}
        undoData={undoData}
        redoData={redoData}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        dataHistoryIndex={dataHistory.index}
        dataHistoryLength={dataHistory.items.length}
      />
      <div className="h-80 overflow-y-auto border-b border-gray-600">
        {view === View.items && itemData && (
          <MightyMikeItemMenu
            itemData={itemData}
            setItemData={setItemDataNotNull}
            headerData={headerData}
            setHeaderData={setHeaderData}
          />
        )}
        {view === View.supertiles && (
          <MightyMikeTileMenu
            headerData={headerData}
            setHeaderData={setHeaderData}
            terrainData={terrainData}
            setTerrainData={setTerrainData}
            mapImages={mapImages}
            setMapImages={setMapImages}
          />
        )}
        {view === View.tiles && (
          <div className="p-4">
            <h3 className="font-bold">Tile Attributes</h3>
            <p className="text-sm text-gray-600">
              Tile collision and behavior attributes (view only for Mighty Mike).
            </p>
          </div>
        )}
      </div>
      <div className="w-full min-h-0 flex-1 border-2 border-black overflow-clip relative">
        {/* Item Filter Toggle - Top Right */}
        {itemData && (
          <div className="absolute top-2 right-2 z-10">
            <ItemFilterToggle />
          </div>
        )}
        {/* Mighty Mike is 2D only - no 3D view */}
        <MightyMikeKonvaView
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
      </div>
    </div>
  );
}
