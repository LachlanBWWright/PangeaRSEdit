/**
 * Nanosaur Editor View
 * 
 * For Nanosaur 1 which uses individual tiles but has minimal features:
 * - No fences
 * - No water bodies
 * - No splines
 * - Just items and terrain
 */

import { useMemo } from "react";
import { Nanosaur1EditorToolbar } from "../toolbars/Nanosaur1EditorToolbar";
import { Updater, useImmer } from "use-immer";
import { useAtomValue } from "jotai";
import { SelectedTile } from "@/data/supertiles/supertileAtoms";
import { CanvasView, CanvasViewMode } from "@/data/canvasView/canvasViewAtoms";
import { ActiveView } from "@/data/globals/activeViewAtom";

import { ItemMenu } from "../subviews/items/ItemMenu";
import { IndividualTilesMenu } from "./IndividualTilesMenu";
import { BugdomTileMenu } from "../subviews/bugdom/BugdomTileMenu";
import { Nanosaur1KonvaView } from "../canvas/Nanosaur1KonvaView";
import { ThreeView } from "../threejs/Three";
import { View } from "../viewEnum";
import { ItemFilterToggle } from "../subviews/filters/ItemFilterToggle";
import { EditorCanvasControls } from "../subviews/EditorCanvasControls";
import { MenuSection } from "./MenuSection";
import {
  createNonNullUpdater,
  createUndoRedoKeyHandler,
  createZoomInHandler,
  createZoomOutHandler,
  terrainHasSupertileData,
} from "../utils/editorViewUtils";
import { applySupertileResizeToAtomicData } from "../utils/levelResizeHandlers";
import { Globals } from "@/data/globals/globals";
import type { NanosaurEditorViewProps } from "../utils/editorViewTypes";
import {
  ItemData,
} from "@/python/structSpecs/LevelTypes";
import { useWindowKeyDown } from "@/hooks/useWindowKeyDown";

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
  const globals = useAtomValue(Globals);
  const view = useAtomValue(ActiveView);
  const selectedTile = useAtomValue(SelectedTile);
  const [stage, setStage] = useImmer({ scale: 1, x: 0, y: 0 });

  const handleKeyDown = useMemo(
    () => createUndoRedoKeyHandler(undoData, redoData),
    [undoData, redoData]
  );

  useWindowKeyDown(handleKeyDown);

  const zoomIn = useMemo(() => createZoomInHandler(setStage), [setStage]);
  const zoomOut = useMemo(() => createZoomOutHandler(setStage), [setStage]);

  const setItemDataNotNull: Updater<ItemData> = useMemo(
    () => createNonNullUpdater(setItemData),
    [setItemData]
  );

  const showSupertileMenu = terrainHasSupertileData(terrainData);
  const handleSupertileResize = (
    direction: "top" | "bottom" | "left" | "right",
    supertileCount: number,
  ) => {
    const result = applySupertileResizeToAtomicData(
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
        tileCount: supertileCount * globals.TILES_PER_SUPERTILE,
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
      <Nanosaur1EditorToolbar
        terrainHasSTgd={showSupertileMenu}
      />
      <MenuSection scrollable={view !== View.supertiles}>
        {view === View.items && itemData && (
          <ItemMenu
            itemData={itemData}
            setItemData={setItemDataNotNull}
            headerData={headerData}
            setHeaderData={setHeaderData}
          />
        )}
        {view === View.tiles && (
          <IndividualTilesMenu
            headerData={headerData}
            setHeaderData={setHeaderData}
            terrainData={terrainData}
          />
        )}
        {view === View.supertiles && showSupertileMenu && (
          <BugdomTileMenu
            key={selectedTile}
            headerData={headerData}
            setHeaderData={setHeaderData}
            terrainData={terrainData}
            setTerrainData={setTerrainData}
            mapImages={mapImages}
            setMapImages={setMapImages}
            onResizeSupertiles={handleSupertileResize}
          />
        )}
      </MenuSection>
      <div className="w-full min-h-0 flex-1 border-2 border-black overflow-hidden relative">
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          <EditorCanvasControls
            undoData={undoData}
            redoData={redoData}
            zoomOut={zoomOut}
            zoomIn={zoomIn}
            dataHistoryIndex={dataHistory.index}
            dataHistoryLength={dataHistory.items.length}
          />
          {itemData && <ItemFilterToggle />}
        </div>
        {canvasViewMode === CanvasView.THREE_D && view === View.tiles ? (
          <ThreeView
            headerData={headerData}
            fenceData={null}
            liquidData={null}
            itemData={itemData}
            splineData={null}
            terrainData={terrainData}
            mapImages={mapImages}
            setTerrainData={setTerrainData}
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
