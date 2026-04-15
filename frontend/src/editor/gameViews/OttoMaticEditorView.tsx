/**
 * Otto Matic Editor View
 * 
 * Complete editor view for Otto Matic with all features:
 * - Fences, water, items, splines
 * - Electric floor tile options
 * - 3D terrain view
 */

import { useEffect, useMemo } from "react";
import { StandardEditorToolbar } from "../toolbars/StandardEditorToolbar";
import { Updater, useImmer } from "use-immer";
import { useAtomValue } from "jotai";
import { CanvasView, CanvasViewMode } from "@/data/canvasView/canvasViewAtoms";
import { ActiveView } from "@/data/globals/activeViewAtom";

import { FenceMenu } from "../subviews/fences/FenceMenu";
import { ItemMenu } from "../subviews/items/ItemMenu";
import { SplineMenu } from "../subviews/splines/SplineMenu";
import { WaterMenu } from "../subviews/water/WaterMenu";
import { OttoMaticTilesMenu } from "./OttoMaticTilesMenu";
import { SupertileMenu } from "../subviews/supertiles/SupertilesMenu";
import { OttoMaticKonvaView } from "../canvas/OttoMaticKonvaView";
import { ThreeView } from "../threejs/Three";
import { View } from "../viewEnum";
import { ItemFilterToggle } from "../subviews/filters/ItemFilterToggle";
import { EditorCanvasControls } from "../subviews/EditorCanvasControls";
import { MenuSection } from "./MenuSection";
import {
  EmptyFencePrompt,
  EmptyWaterPrompt,
  EmptySplinePrompt,
} from "../subviews/EmptyDataPrompts";
import {
  createEmptyFenceData,
  createEmptyLiquidData,
  createEmptySplineData,
} from "../utils/dataInitializers";
import {
  createNonNullUpdater,
  createUndoRedoKeyHandler,
  createZoomInHandler,
  createZoomOutHandler,
  terrainHasSupertileData,
} from "../utils/editorViewUtils";
import { applySupertileResizeToAtomicData } from "../utils/levelResizeHandlers";
import { Globals } from "@/data/globals/globals";
import { useSetAtom } from "jotai";
import { editorNavbarTabsAtom } from "@/data/globals/editorNavbarAtoms";
import type { EditorViewProps } from "../utils/editorViewTypes";
import {
  ItemData,
  LiquidData,
  FenceData,
  SplineData,
} from "@/python/structSpecs/LevelTypes";
import { useWindowKeyDown } from "@/hooks/useWindowKeyDown";

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
  const globals = useAtomValue(Globals);
  const setEditorNavbarTabs = useSetAtom(editorNavbarTabsAtom);
  const view = useAtomValue(ActiveView);
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
  useEffect(() => {
    setEditorNavbarTabs(
      <StandardEditorToolbar
        terrainHasSTgd={showSupertileMenu}
        compact
      />,
    );
    return () => setEditorNavbarTabs(null);
  }, [setEditorNavbarTabs, showSupertileMenu]);

  const handleSupertileResize = (
    direction: "top" | "bottom" | "left" | "right",
    supertileCount: number,
  ) => {
    const result = applySupertileResizeToAtomicData(
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
    if (resized.liquidData !== undefined) setLiquidData(resized.liquidData);
    if (resized.fenceData !== undefined) setFenceData(resized.fenceData);
    if (resized.splineData !== undefined) setSplineData(resized.splineData);
    if (resized.terrainData) setTerrainData(resized.terrainData);
  };

  return (
    <div className="flex flex-col flex-1 w-full gap-2 min-h-0">
      <MenuSection>
        {view === View.fences && (
          fenceData ? (
            <FenceMenu fenceData={fenceData} setFenceData={setFenceDataNotNull} />
          ) : (
            <EmptyFencePrompt onInitialize={() => setFenceData(createEmptyFenceData())} />
          )
        )}
        {view === View.water && (
          liquidData ? (
            <WaterMenu liquidData={liquidData} setLiquidData={setLiquidDataNotNull} />
          ) : (
            <EmptyWaterPrompt onInitialize={() => setLiquidData(createEmptyLiquidData())} />
          )
        )}
        {view === View.items && itemData && (
          <ItemMenu
            itemData={itemData}
            setItemData={setItemDataNotNull}
            headerData={headerData}
            setHeaderData={setHeaderData}
          />
        )}
        {view === View.splines && (
          splineData ? (
            <SplineMenu
              splineData={splineData}
              setSplineData={setSplineDataNotNull}
              headerData={headerData}
              setHeaderData={setHeaderData}
            />
          ) : (
            <EmptySplinePrompt onInitialize={() => setSplineData(createEmptySplineData())} />
          )
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
            onResizeSupertiles={handleSupertileResize}
          />
        )}
      </MenuSection>
      <div className="w-full min-h-0 flex-1 border-2 border-black overflow-clip relative">
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
            liquidData={liquidData}
            itemData={itemData}
            splineData={splineData}
            terrainData={terrainData}
            mapImages={mapImages}
            setTerrainData={setTerrainData}
          />
        ) : (
          <OttoMaticKonvaView
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
