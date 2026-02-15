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
import { EditorCanvasControls } from "../subviews/EditorCanvasControls";
import {
  createNonNullUpdater,
  createUndoRedoKeyHandler,
  createZoomInHandler,
  createZoomOutHandler,
} from "../utils/editorViewUtils";
import { applyResizeToAtomicData } from "../utils/levelResizeHandlers";
import { Globals } from "@/data/globals/globals";
import { useAtomValue } from "jotai";
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
  const globals = useAtomValue(Globals);
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

  const handleResize = (direction: "top" | "bottom" | "left" | "right", tileCount: number) => {
    const result = applyResizeToAtomicData(
      {
        headerData,
        itemData,
        liquidData: null,
        fenceData: null,
        splineData: null,
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
    if (resized.terrainData) setTerrainData(resized.terrainData);
  };

  return (
    <div className="flex flex-col flex-1 w-full gap-2 min-h-0">
      <MightyMikeEditorToolbar
        view={view}
        setView={setView}
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
            onResize={handleResize}
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
        <div className="absolute top-2 left-2 z-10">
          <EditorCanvasControls
            undoData={undoData}
            redoData={redoData}
            zoomOut={zoomOut}
            zoomIn={zoomIn}
            dataHistoryIndex={dataHistory.index}
            dataHistoryLength={dataHistory.items.length}
          />
        </div>
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
