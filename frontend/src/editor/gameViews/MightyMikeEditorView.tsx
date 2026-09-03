/**
 * Mighty Mike Editor View
 *
 * For Mighty Mike which uses individual tiles:
 * - Items
 * - Terrain tiles
 * - No fences, water bodies, or splines
 */

import { useEffect, useMemo } from "react";
import { useImmer, Updater } from "use-immer";
import { MightyMikeEditorToolbar } from "../toolbars/MightyMikeEditorToolbar";

import { MightyMikeItemMenu } from "../subviews/items/MightyMikeItemMenu";
import { ScriptsMenu } from "../subviews/scripts/ScriptsMenu";
import { MightyMikeTileMenu } from "../subviews/mightymike/MightyMikeTileMenu";
import { MightyMikeTilesetDataPanel } from "../subviews/mightymike/MightyMikeTilesetDataPanel";
import { MightyMikeKonvaView } from "../canvas/MightyMikeKonvaView";
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
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { editorNavbarTabsAtom } from "@/data/globals/editorNavbarAtoms";
import type { MightyMikeEditorViewProps } from "../utils/editorViewTypes";
import { ItemData } from "@/python/structSpecs/LevelTypes";
import {
  CurrentScene,
  MightyMikeCanvasEditMode,
  MightyMikeOverlayMode,
} from "@/data/game/gameAtoms";
import { ActiveView } from "@/data/globals/activeViewAtom";
import { ENABLE_SCRIPTS } from "@/config/featureFlags";
import { useWindowKeyDown } from "@/hooks/useWindowKeyDown";
import { resizeEditorAtomicTiles } from "@/editor/gameViews/editorResizeState";
import { EmptyItemPrompt } from "../subviews/EmptyDataPrompts";
import { createEmptyItemData } from "../utils/dataInitializers";

function getCurrentSceneFromTerrainData(
  terrainData: MightyMikeEditorViewProps["terrainData"],
): string | undefined {
  const metadata = terrainData._metadata?.[1000];
  if (
    metadata &&
    typeof metadata === "object" &&
    "obj" in metadata &&
    metadata.obj &&
    typeof metadata.obj === "object" &&
    "mightyMikeScene" in metadata.obj &&
    typeof metadata.obj.mightyMikeScene === "string"
  ) {
    return metadata.obj.mightyMikeScene;
  }
  return undefined;
}

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
  const setCurrentScene = useSetAtom(CurrentScene);
  const setCanvasEditMode = useSetAtom(MightyMikeCanvasEditMode);
  const setOverlayMode = useSetAtom(MightyMikeOverlayMode);
  const setEditorNavbarTabs = useSetAtom(editorNavbarTabsAtom);
  const [storedView, setView] = useAtom(ActiveView);
  const view = normalizeEditorView(
    storedView,
    ENABLE_SCRIPTS
      ? [View.items, View.scripts, View.supertiles, View.tiles, View.animations]
      : [View.items, View.supertiles, View.tiles, View.animations],
    View.supertiles,
  );
  const [stage, setStage] = useImmer({ scale: 1, x: 0, y: 0 });

  const handleKeyDown = useMemo(
    () => createUndoRedoKeyHandler(undoData, redoData),
    [undoData, redoData],
  );

  useWindowKeyDown(handleKeyDown);

  useEffect(() => {
    setCurrentScene(getCurrentSceneFromTerrainData(terrainData));
  }, [setCurrentScene, terrainData]);

  useEffect(() => {
    if (storedView !== view) setView(view);
  }, [setView, storedView, view]);

  useEffect(() => {
    setCanvasEditMode("select");
    setOverlayMode("none");
  }, [setCanvasEditMode, setOverlayMode, view]);

  useEffect(() => {
    setEditorNavbarTabs(<MightyMikeEditorToolbar compact />);
    return () => setEditorNavbarTabs(null);
  }, [setEditorNavbarTabs]);

  const zoomIn = useMemo(() => createZoomInHandler(setStage), [setStage]);
  const zoomOut = useMemo(() => createZoomOutHandler(setStage), [setStage]);

  const setItemDataNotNull: Updater<ItemData> = useMemo(
    () => createNonNullUpdater(setItemData),
    [setItemData],
  );

  const handleResize = (
    direction: "top" | "bottom" | "left" | "right",
    tileCount: number,
  ) => {
    return resizeEditorAtomicTiles({
      headerData,
      itemData,
      liquidData: null,
      fenceData: null,
      splineData: null,
      terrainData,
      globals,
      direction,
      tileCount,
      defaultHeight: headerData.Hedr[1000].obj.minY ?? 0,
      setHeaderData,
      setItemData,
      setLiquidData: () => {
        // Mighty Mike doesn't have liquid data
      },
      setFenceData: () => {
        // Mighty Mike doesn't have fence data
      },
      setSplineData: () => {
        // Mighty Mike doesn't have spline data
      },
      setTerrainData,
    });
  };

  return (
    <div className="flex flex-col flex-1 w-full gap-2 min-h-0">
      <MenuSection
        scrollable={view !== View.animations}
        className={view === View.scripts ? "h-full" : undefined}
      >
        {view === View.items &&
          (itemData ? (
            <MightyMikeItemMenu
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
        {view === View.supertiles && (
          <MightyMikeTileMenu
            mode="visual"
            headerData={headerData}
            terrainData={terrainData}
            setTerrainData={setTerrainData}
            mapImages={mapImages}
            setMapImages={setMapImages}
          />
        )}
        {view === View.tiles && (
          <MightyMikeTileMenu
            mode="behavior"
            headerData={headerData}
            terrainData={terrainData}
            setTerrainData={setTerrainData}
            mapImages={mapImages}
            setMapImages={setMapImages}
          />
        )}
        {view === View.animations && (
          <MightyMikeTilesetDataPanel
            terrainData={terrainData}
            setTerrainData={setTerrainData}
            mapImages={mapImages}
          />
        )}
      </MenuSection>
      {view !== View.scripts && (
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
            {itemData && <ItemFilterToggle itemData={itemData} splineData={null} />}
          </div>
          {/* Mighty Mike is 2D only - no 3D view */}
          <MightyMikeKonvaView
            headerData={headerData}
            itemData={itemData}
            setItemData={setItemData}
            terrainData={terrainData}
            setTerrainData={setTerrainData}
            mapImages={mapImages}
            stage={stage}
            setStage={setStage}
            onResize={handleResize}
          />
        </div>
      )}
    </div>
  );
}
