/**
 * Nanosaur Editor View
 *
 * For Nanosaur 1 which uses individual tiles but has minimal features:
 * - No fences
 * - No water bodies
 * - No splines
 * - Just items and terrain
 */

import { useEffect, useMemo } from "react";
import { Nanosaur1EditorToolbar } from "../toolbars/Nanosaur1EditorToolbar";
import { Updater, useImmer } from "use-immer";
import { useAtomValue, useSetAtom } from "jotai";
import { CanvasView, CanvasViewMode } from "@/data/canvasView/canvasViewAtoms";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { ENABLE_SCRIPTS } from "@/config/featureFlags";

import { ItemMenu } from "../subviews/items/ItemMenu";
import { ScriptsMenu } from "../subviews/scripts/ScriptsMenu";
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
  normalizeEditorView,
} from "../utils/editorViewUtils";
import { Globals } from "@/data/globals/globals";
import type { NanosaurEditorViewProps } from "../utils/editorViewTypes";
import { ItemData } from "@/python/structSpecs/LevelTypes";
import { useWindowKeyDown } from "@/hooks/useWindowKeyDown";
import { resizeNanosaurSupertiles } from "@/editor/gameViews/nanosaurEditorState";
import { EmptyItemPrompt } from "../subviews/EmptyDataPrompts";
import { createEmptyItemData } from "../utils/dataInitializers";
import { editorNavbarTabsAtom } from "@/data/globals/editorNavbarAtoms";
import { NanosaurCollisionPathMenu } from "../subviews/tiles/NanosaurCollisionPathMenu";

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
  const storedView = useAtomValue(ActiveView);
  const setView = useSetAtom(ActiveView);
  const setEditorNavbarTabs = useSetAtom(editorNavbarTabsAtom);
  const [stage, setStage] = useImmer({ scale: 1, x: 0, y: 0 });

  const handleKeyDown = useMemo(
    () => createUndoRedoKeyHandler(undoData, redoData),
    [undoData, redoData],
  );

  useWindowKeyDown(handleKeyDown);

  const zoomIn = useMemo(() => createZoomInHandler(setStage), [setStage]);
  const zoomOut = useMemo(() => createZoomOutHandler(setStage), [setStage]);

  const setItemDataNotNull: Updater<ItemData> = useMemo(
    () => createNonNullUpdater(setItemData),
    [setItemData],
  );

  const allowedViews = ENABLE_SCRIPTS
    ? [View.items, View.scripts, View.tiles, View.supertiles, View.collisionPath]
    : [View.items, View.tiles, View.supertiles, View.collisionPath];
  const view = normalizeEditorView(
    storedView,
    allowedViews,
    View.supertiles,
  );
  useEffect(() => {
    if (storedView !== view) setView(view);
  }, [setView, storedView, view]);
  useEffect(() => {
    setEditorNavbarTabs(<Nanosaur1EditorToolbar compact />);
    return () => setEditorNavbarTabs(null);
  }, [setEditorNavbarTabs]);
  const handleSupertileResize = (
    direction: "top" | "bottom" | "left" | "right",
    supertileCount: number,
  ) => {
    return resizeNanosaurSupertiles({
      headerData,
      itemData,
      terrainData,
      globals,
      setHeaderData,
      setItemData,
      setTerrainData,
      direction,
      supertileCount,
    });
  };

  return (
    <div className="flex flex-col flex-1 w-full gap-2 min-h-0">
      <MenuSection key={view} scrollable={true}>
        {view === View.items &&
          (itemData ? (
            <ItemMenu
              itemData={itemData}
              setItemData={setItemDataNotNull}
              headerData={headerData}
              setHeaderData={setHeaderData}
            />
          ) : (
            <EmptyItemPrompt
              onInitialize={() => setItemData(createEmptyItemData())}
            />
          ))}
        {ENABLE_SCRIPTS && view === View.scripts && (
          <ScriptsMenu
            headerData={headerData}
            itemData={itemData}
            liquidData={null}
            fenceData={null}
            splineData={null}
            terrainData={terrainData}
            mapImages={mapImages}
          />
        )}
        {view === View.tiles && (
          <IndividualTilesMenu
            headerData={headerData}
            setHeaderData={setHeaderData}
            terrainData={terrainData}
          />
        )}
        {view === View.supertiles && (
          <BugdomTileMenu
            headerData={headerData}
            setHeaderData={setHeaderData}
            terrainData={terrainData}
            setTerrainData={setTerrainData}
            mapImages={mapImages}
            setMapImages={setMapImages}
          />
        )}
        {view === View.collisionPath && (
          <NanosaurCollisionPathMenu terrainData={terrainData} />
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
            onResize={handleSupertileResize}
          />
        )}
      </div>
    </div>
  );
}
