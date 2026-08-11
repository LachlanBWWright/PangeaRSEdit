/**
 * Otto Matic KonvaView - Full-featured view for Otto Matic and similar games
 *
 * Features:
 * - Uses pre-composed supertiles (8x8 tiles)
 * - Supports fences
 * - Supports liquid/water bodies
 * - Supports splines
 * - All features enabled
 */

import { SelectedFence } from "@/data/fences/fenceAtoms";
import { ClickToAddItem, SelectedItem } from "@/data/items/itemAtoms";
import { SelectedSpline } from "@/data/splines/splineAtoms";
import { SelectedWaterBody } from "@/data/water/waterAtoms";
import { PendingCreation } from "@/data/creation/pendingCreationAtom";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";
import { useContainerSize } from "@/hooks/useContainerSize";
import { Layer, Stage } from "react-konva";
import Konva from "konva";
import { computeWheelZoomStage } from "./konvaViewState";
import { Updater } from "use-immer";
import { Items } from "../subviews/Items";
import { Fences } from "../subviews/Fences";
import { Splines } from "../subviews/Splines";
import { WaterBodies } from "../subviews/WaterBodies";
import { AccessibilityMaskOverlay } from "../subviews/AccessibilityMaskOverlay";
import { Tiles } from "../subviews/Tiles";
import { StandardSupertiles } from "../subviews/supertiles/StandardSupertiles";
import {
  HeaderData,
  ItemData,
  LiquidData,
  FenceData,
  SplineData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { HoverTagOverlayLayer } from "../subviews/shared/HoverTagOverlayLayer";
import { PendingCreationOverlay } from "../subviews/shared/PendingCreationOverlay";
import { View } from "../viewEnum";
import { CustomScriptPlacements } from "../subviews/CustomScriptPlacements";
import { Globals } from "@/data/globals/globals";
import {
  MapResizeEdgeControls,
  type MapResizeDirection,
} from "./MapResizeEdgeControls";
import { useCustomObjectPlacement } from "../subviews/scripts/useCustomObjectPlacement";
import { CheckpointLayer } from "../subviews/checkpoints/CheckpointLayer";
import { CroMagPathLayer } from "../subviews/paths/CroMagPathLayer";
import { getGameFeatures } from "../utils/gameFeatures";

export interface StageData {
  scale: number;
  x: number;
  y: number;
}

interface OttoMaticKonvaViewProps {
  headerData: HeaderData;
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
  view: View;
  stage: StageData;
  setStage: Updater<StageData>;
  onResize: (direction: MapResizeDirection, amount: number) => Promise<void>;
}

export function OttoMaticKonvaView({
  headerData,
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
  view,
  stage,
  setStage,
  onResize,
}: OttoMaticKonvaViewProps) {
  const setSelectedFence = useSetAtom(SelectedFence);
  const setSelectedItem = useSetAtom(SelectedItem);
  const setSelectedSpline = useSetAtom(SelectedSpline);
  const setSelectedWaterBody = useSetAtom(SelectedWaterBody);
  const setPendingCreation = useSetAtom(PendingCreation);
  const clickToAddItem = useAtomValue(ClickToAddItem);
  const customObjectPlacement = useCustomObjectPlacement();
  const pendingCreation = useAtomValue(PendingCreation);
  const globals = useAtomValue(Globals);
  const gameFeatures = getGameFeatures(globals.GAME_TYPE);

  const [containerRef, containerSize] = useContainerSize();

  // Non-null updaters for children that expect non-null data
  const setItemDataNotNull: Updater<ItemData> = useCallback(
    (updater) => {
      setItemData((current) => {
        if (!current) return current;
        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    [setItemData],
  );

  const setLiquidDataNotNull: Updater<LiquidData> = useCallback(
    (updater) => {
      setLiquidData((current) => {
        if (!current) return current;
        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    [setLiquidData],
  );

  const setFenceDataNotNull: Updater<FenceData> = useCallback(
    (updater) => {
      setFenceData((current) => {
        if (!current) return current;
        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    [setFenceData],
  );

  const setSplineDataNotNull: Updater<SplineData> = useCallback(
    (updater) => {
      setSplineData((current) => {
        if (!current) return current;
        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    [setSplineData],
  );

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (pendingCreation) {
        const stageRef = e.target.getStage();
        const pos = stageRef?.getRelativePointerPosition();
        if (!pos) return;
        setPendingCreation({
          ...pendingCreation,
          points: [
            ...pendingCreation.points,
            { x: Math.round(pos.x), z: Math.round(pos.y) },
          ],
        });
        return;
      }
      const stageRef = e.target.getStage();
      const customPos = stageRef?.getRelativePointerPosition();
      if (customPos && customObjectPlacement.objectId !== null) {
        customObjectPlacement.placeAt(
          Math.round(customPos.x),
          headerData.Hedr[1000].obj.minY ?? 0,
          Math.round(customPos.y),
        );
        return;
      }
      if (clickToAddItem === undefined) return;
      const nativeStageRef = e.target.getStage();
      const pos = nativeStageRef?.getRelativePointerPosition();
      if (!pos) return;
      setItemDataNotNull((itemData) => {
        itemData.Itms[1000].obj.push({
          x: Math.round(pos.x),
          z: Math.round(pos.y),
          type: clickToAddItem,
          flags: 0,
          p0: 0,
          p1: 0,
          p2: 0,
          p3: 0,
        });
      });
    },
    [
      clickToAddItem,
      customObjectPlacement,
      headerData,
      pendingCreation,
      setItemDataNotNull,
      setPendingCreation,
    ],
  );

  const handleStageDblClick = useCallback(() => {
    setSelectedFence(undefined);
    setSelectedItem(undefined);
    setSelectedSpline(undefined);
    setSelectedWaterBody(null);
  }, [
    setSelectedFence,
    setSelectedItem,
    setSelectedSpline,
    setSelectedWaterBody,
  ]);

  const handleStageWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      const nextStage = computeWheelZoomStage(e);
      if (nextStage) setStage(nextStage);
    },
    [setStage],
  );

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <Stage
        width={containerSize.width}
        height={containerSize.height}
        scaleX={stage.scale}
        scaleY={stage.scale}
        x={stage.x}
        y={stage.y}
        draggable={true}
        onClick={handleStageClick}
        onDblClick={handleStageDblClick}
        onWheel={handleStageWheel}
      >
        {/* Render pre-composed supertiles (Otto uses STgd) */}
        {terrainData && terrainData.STgd && (
          <StandardSupertiles
            headerData={headerData}
            terrainData={terrainData}
            mapImages={mapImages}
          />
        )}

        {view !== View.tiles && (
          <AccessibilityMaskOverlay
            headerData={headerData}
            terrainData={terrainData}
          />
        )}

        {/* Tile editing view */}
        {view === View.tiles && (
          <Tiles
            headerData={headerData}
            terrainData={terrainData}
            setTerrainData={setTerrainData}
            isEditingTopology={true}
          />
        )}

        {/* All non-tiles views: render layers with stable keys so React preserves
            component instances when switching tabs. The primary view's layer is
            rendered last to ensure it appears on top (highest z-order). */}
        {view !== View.tiles && (
          <>
            {/* Base layers - rendered first (below primary) */}
            {liquidData && view !== View.water && (
              <WaterBodies
                key="water"
                headerData={headerData}
                terrainData={terrainData}
                liquidData={liquidData}
                setLiquidData={setLiquidDataNotNull}
                fenceData={fenceData}
              />
            )}
            {fenceData && view !== View.fences && (
              <Fences
                key="fences"
                fenceData={fenceData}
                setFenceData={setFenceDataNotNull}
                liquidData={liquidData}
              />
            )}
            {itemData && view !== View.items && (
              <Items
                key="items"
                headerData={headerData}
                terrainData={terrainData}
                itemData={itemData}
                setItemData={setItemDataNotNull}
              />
            )}
            {splineData && view !== View.splines && (
              <Splines
                key="splines"
                splineData={splineData}
                setSplineData={setSplineDataNotNull}
              />
            )}
            {/* Primary layer rendered last (highest z-order) */}
            {view === View.water && liquidData && (
              <WaterBodies
                key="water"
                headerData={headerData}
                terrainData={terrainData}
                liquidData={liquidData}
                setLiquidData={setLiquidDataNotNull}
                fenceData={fenceData}
              />
            )}
            {view === View.fences && fenceData && (
              <Fences
                key="fences"
                fenceData={fenceData}
                setFenceData={setFenceDataNotNull}
                liquidData={liquidData}
              />
            )}
            {view === View.items && itemData && (
              <Items
                key="items"
                headerData={headerData}
                terrainData={terrainData}
                itemData={itemData}
                setItemData={setItemDataNotNull}
              />
            )}
            {view === View.splines && splineData && (
              <Splines
                key="splines"
                splineData={splineData}
                setSplineData={setSplineDataNotNull}
              />
            )}
            <CustomScriptPlacements />
            {view === View.supertiles &&
              (gameFeatures.hasPaths || gameFeatures.hasCheckpoints) && (
              <Layer>
                {gameFeatures.hasPaths && (
                  <CroMagPathLayer
                    terrainData={terrainData}
                    setTerrainData={setTerrainData}
                  />
                )}
                {gameFeatures.hasCheckpoints && (
                  <CheckpointLayer
                    terrainData={terrainData}
                    setTerrainData={setTerrainData}
                    coordinateScale={1}
                  />
                )}
              </Layer>
            )}
          </>
        )}
        <PendingCreationOverlay />
        {/* Hover tag overlay — always rendered last so name tags appear above all layers */}
        <HoverTagOverlayLayer />
        <MapResizeEdgeControls
          mapWidth={headerData.Hedr[1000].obj.mapWidth}
          mapHeight={headerData.Hedr[1000].obj.mapHeight}
          tileSize={globals.TILE_SIZE}
          tilesPerUnit={globals.TILES_PER_SUPERTILE}
          onResize={onResize}
        />
      </Stage>
    </div>
  );
}
