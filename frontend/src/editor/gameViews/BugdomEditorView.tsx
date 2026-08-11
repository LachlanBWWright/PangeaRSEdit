/**
 * Bugdom Editor View
 *
 * For Bugdom 1 which uses individual 32x32 tiles
 * Has fences, items, splines but different tile system (no water)
 */

import { useEffect, useMemo } from "react";
import { Bugdom1EditorToolbar } from "../toolbars/Bugdom1EditorToolbar";
import { Updater, useImmer } from "use-immer";
import { useAtomValue } from "jotai";
import { SelectedTile } from "@/data/supertiles/supertileAtoms";
import { CanvasView, CanvasViewMode } from "@/data/canvasView/canvasViewAtoms";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { ENABLE_SCRIPTS } from "@/config/featureFlags";

import { FenceMenu } from "../subviews/fences/FenceMenu";
import { ItemMenu } from "../subviews/items/ItemMenu";
import { ScriptsMenu } from "../subviews/scripts/ScriptsMenu";
import { SplineMenu } from "../subviews/splines/SplineMenu";
import { IndividualTilesMenu } from "./IndividualTilesMenu";
import { BugdomTileMenu } from "../subviews/bugdom/BugdomTileMenu";
import { Bugdom1KonvaView } from "../canvas/Bugdom1KonvaView";
import { ThreeView } from "../threejs/Three";
import { View } from "../viewEnum";
import { ItemFilterToggle } from "../subviews/filters/ItemFilterToggle";
import { EditorCanvasControls } from "../subviews/EditorCanvasControls";
import { MenuSection } from "./MenuSection";
import {
  EmptyFencePrompt,
  EmptyItemPrompt,
  EmptySplinePrompt,
} from "../subviews/EmptyDataPrompts";
import {
  createEmptyFenceData,
  createEmptyItemData,
  createEmptySplineData,
} from "../utils/dataInitializers";
import {
  createNonNullUpdater,
  createUndoRedoKeyHandler,
  createZoomInHandler,
  createZoomOutHandler,
  normalizeEditorView,
} from "../utils/editorViewUtils";
import { Globals } from "@/data/globals/globals";
import { useSetAtom } from "jotai";
import { editorNavbarTabsAtom } from "@/data/globals/editorNavbarAtoms";
import type { BugdomEditorViewProps } from "../utils/editorViewTypes";
import {
  ItemData,
  FenceData,
  SplineData,
} from "@/python/structSpecs/LevelTypes";
import { useWindowKeyDown } from "@/hooks/useWindowKeyDown";
import { resizeEditorAtomicSupertiles } from "@/editor/gameViews/editorResizeState";
import { BugdomVertexColorMenu } from "../subviews/bugdom/BugdomVertexColorMenu";

export function BugdomEditorView({
  headerData,
  setHeaderData,
  itemData,
  setItemData,
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
}: BugdomEditorViewProps) {
  const canvasViewMode = useAtomValue(CanvasViewMode);
  const globals = useAtomValue(Globals);
  const setEditorNavbarTabs = useSetAtom(editorNavbarTabsAtom);
  const storedView = useAtomValue(ActiveView);
  const setView = useSetAtom(ActiveView);
  const selectedTile = useAtomValue(SelectedTile);
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
  const setFenceDataNotNull: Updater<FenceData> = useMemo(
    () => createNonNullUpdater(setFenceData),
    [setFenceData],
  );
  const setSplineDataNotNull: Updater<SplineData> = useMemo(
    () => createNonNullUpdater(setSplineData),
    [setSplineData],
  );

  const view = normalizeEditorView(
    storedView,
    ENABLE_SCRIPTS
      ? [View.fences, View.items, View.splines, View.scripts, View.tiles, View.supertiles, View.vertexColors]
      : [View.fences, View.items, View.splines, View.tiles, View.supertiles, View.vertexColors],
    View.supertiles,
  );
  useEffect(() => {
    if (storedView !== view) setView(view);
  }, [setView, storedView, view]);
  useEffect(() => {
    setEditorNavbarTabs(<Bugdom1EditorToolbar compact />);
    return () => setEditorNavbarTabs(null);
  }, [setEditorNavbarTabs]);

  const handleSupertileResize = (
    direction: "top" | "bottom" | "left" | "right",
    supertileCount: number,
  ) => {
    return resizeEditorAtomicSupertiles({
      headerData,
      itemData,
      liquidData: null,
      fenceData,
      splineData,
      terrainData,
      globals,
      direction,
      supertileCount,
      defaultHeight: headerData.Hedr[1000].obj.minY ?? 0,
      setHeaderData,
      setItemData,
      setLiquidData: () => {
        // Bugdom 1 doesn't have liquid data
      },
      setFenceData,
      setSplineData,
      setTerrainData,
    });
  };

  return (
    <div className="flex flex-col flex-1 w-full gap-2 min-h-0">
      <MenuSection key={view} scrollable={true}>
        {view === View.fences &&
          (fenceData ? (
            <FenceMenu
              fenceData={fenceData}
              setFenceData={setFenceDataNotNull}
            />
          ) : (
            <EmptyFencePrompt
              onInitialize={() => setFenceData(createEmptyFenceData())}
            />
          ))}
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
            fenceData={fenceData}
            splineData={splineData}
            terrainData={terrainData}
            mapImages={mapImages}
          />
        )}
        {view === View.splines &&
          (splineData ? (
            <SplineMenu
              splineData={splineData}
              setSplineData={setSplineDataNotNull}
              headerData={headerData}
              setHeaderData={setHeaderData}
            />
          ) : (
            <EmptySplinePrompt
              onInitialize={() => setSplineData(createEmptySplineData())}
            />
          ))}
        {view === View.tiles && (
          <IndividualTilesMenu
            headerData={headerData}
            setHeaderData={setHeaderData}
            terrainData={terrainData}
          />
        )}
        {view === View.supertiles && (
          <BugdomTileMenu
            key={selectedTile}
            headerData={headerData}
            setHeaderData={setHeaderData}
            terrainData={terrainData}
            setTerrainData={setTerrainData}
            mapImages={mapImages}
            setMapImages={setMapImages}
          />
        )}
        {view === View.vertexColors && (
          <BugdomVertexColorMenu terrainData={terrainData} />
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
            fenceData={fenceData}
            liquidData={null}
            itemData={itemData}
            splineData={splineData}
            terrainData={terrainData}
            mapImages={mapImages}
            setTerrainData={setTerrainData}
          />
        ) : (
          <Bugdom1KonvaView
            headerData={headerData}
            itemData={itemData}
            setItemData={setItemData}
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
            onResize={handleSupertileResize}
          />
        )}
      </div>
    </div>
  );
}
