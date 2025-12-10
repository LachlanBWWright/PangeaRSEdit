import { useState, useEffect, useCallback, useMemo } from "react";
import { EditorToolbar } from "./EditorToolbar";
import {
  HeaderData,
  ItemData,
  LiquidData,
  FenceData,
  SplineData,
  TerrainData,
} from "../python/structSpecs/ottoMaticLevelData";
import { Updater, useImmer } from "use-immer";

import { FenceMenu } from "./subviews/fences/FenceMenu";
import { ItemMenu } from "./subviews/items/ItemMenu";
import { SplineMenu } from "./subviews/splines/SplineMenu";
import { WaterMenu } from "./subviews/water/WaterMenu";

import { TilesMenu } from "./subviews/tiles/TilesMenu";
import { SupertileMenu } from "./subviews/supertiles/SupertilesMenu";
import { DataHistory } from "./IntroPrompt";
import { KonvaView } from "./canvas/CanvasView";
import { ThreeView } from "./threejs/Three";
import { useAtomValue } from "jotai";
import { CanvasView, CanvasViewMode } from "@/data/canvasView/canvasViewAtoms";
import { Globals } from "@/data/globals/globals";

import { View } from "./viewEnum";
import {
  createNonNullUpdater,
  createUndoRedoKeyHandler,
  createZoomInHandler,
  createZoomOutHandler,
  terrainHasSupertileData,
} from "./utils/editorViewUtils";
import { getGameFeatures } from "./utils/gameFeatures";

export function EditorView({
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
}: {
  headerData: HeaderData;
  setHeaderData: Updater<HeaderData>;
  itemData: ItemData | null;
  setItemData: Updater<ItemData | null>;
  liquidData: LiquidData | null;
  setLiquidData: Updater<LiquidData | null>;
  fenceData: FenceData | null;
  setFenceData: Updater<FenceData | null>;
  splineData: SplineData | null;
  setSplineData: Updater<SplineData | null>;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  mapImages: HTMLCanvasElement[];
  setMapImages: (newCanvases: HTMLCanvasElement[]) => void;
  undoData: () => void;
  redoData: () => void;
  dataHistory: DataHistory;
}) {
  const globals = useAtomValue(Globals);
  const canvasViewMode = useAtomValue(CanvasViewMode);
  const [view, setView] = useState<View>(View.fences);
  const [stage, setStage] = useImmer({
    scale: 1,
    x: 0,
    y: 0,
  });

  // Get game-specific features
  const gameFeatures = useMemo(
    () => getGameFeatures(globals.GAME_TYPE),
    [globals.GAME_TYPE]
  );

  // Extract keyboard handler using utility function
  const handleKeyDown = useMemo(
    () => createUndoRedoKeyHandler(undoData, redoData),
    [undoData, redoData]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Extract zoom handlers using utility functions
  const zoomIn = useMemo(() => createZoomInHandler(setStage), [setStage]);
  const zoomOut = useMemo(() => createZoomOutHandler(setStage), [setStage]);

  // Create non-null updater wrappers using utility function
  const setItemDataNotNull: Updater<ItemData> = useCallback(
    createNonNullUpdater(setItemData),
    [setItemData]
  );

  const setLiquidDataNotNull: Updater<LiquidData> = useCallback(
    createNonNullUpdater(setLiquidData),
    [setLiquidData]
  );

  const setFenceDataNotNull: Updater<FenceData> = useCallback(
    createNonNullUpdater(setFenceData),
    [setFenceData]
  );

  const setSplineDataNotNull: Updater<SplineData> = useCallback(
    createNonNullUpdater(setSplineData),
    [setSplineData]
  );

  // Calculate available menu tabs based on game features and data availability
  const showFenceMenu = gameFeatures.supportsFences && fenceData !== null;
  const showWaterMenu = gameFeatures.supportsWater && liquidData !== null;
  const showSplineMenu = gameFeatures.supportsSplines && splineData !== null;
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
        hasFenceData={showFenceMenu}
        hasLiquidData={showWaterMenu}
      />
      <div>
        {view === View.fences && showFenceMenu && (
          <FenceMenu fenceData={fenceData} setFenceData={setFenceDataNotNull} />
        )}
        {view === View.water && showWaterMenu && (
          <WaterMenu
            liquidData={liquidData}
            setLiquidData={setLiquidDataNotNull}
          />
        )}
        {view === View.items && itemData && (
          <ItemMenu
            itemData={itemData}
            setItemData={setItemDataNotNull}
            headerData={headerData}
            setHeaderData={setHeaderData}
          />
        )}
        {view === View.splines && showSplineMenu && (
          <SplineMenu
            splineData={splineData}
            setSplineData={setSplineDataNotNull}
            headerData={headerData}
            setHeaderData={setHeaderData}
          />
        )}
        {view === View.tiles && (
          <TilesMenu headerData={headerData} setHeaderData={setHeaderData} />
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
