/**
 * Bugdom 1 KonvaView - Specialized view for Bugdom 1's tile system
 *
 * Features:
 * - Uses individual 5x5 tiles (32x32 pixels each)
 * - Supports fences
 * - No liquid/water bodies support
 * - Supports splines
 * - Items, fences, splines, and terrain
 */

import { useAtomValue, useSetAtom } from "jotai";
import { useRef, useCallback, useState, useEffect } from "react";
import { Stage } from "react-konva";
import Konva from "konva";
import { Updater } from "use-immer";
import { SelectedFence } from "@/data/fences/fenceAtoms";
import { ClickToAddItem, SelectedItem } from "@/data/items/itemAtoms";
import { SelectedSpline } from "@/data/splines/splineAtoms";
import { Items } from "../subviews/Items";
import { Fences } from "../subviews/Fences";
import { Splines } from "../subviews/Splines";
import { IndividualTileSupertiles } from "../subviews/supertiles/IndividualTileSupertiles";
import { Tiles } from "../subviews/Tiles";
import {
  HeaderData,
  ItemData,
  FenceData,
  SplineData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { View } from "../viewEnum";

export interface StageData {
  scale: number;
  x: number;
  y: number;
}

interface Bugdom1KonvaViewProps {
  headerData: HeaderData;
  itemData: ItemData | null;
  setItemData: Updater<ItemData | null>;
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
}

export function Bugdom1KonvaView({
  headerData,
  itemData,
  setItemData,
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
}: Bugdom1KonvaViewProps) {
  const setSelectedFence = useSetAtom(SelectedFence);
  const setSelectedItem = useSetAtom(SelectedItem);
  const setSelectedSpline = useSetAtom(SelectedSpline);
  const clickToAddItem = useAtomValue(ClickToAddItem);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({
    width: 3000,
    height: 2000,
  });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    if (typeof ResizeObserver !== "undefined") {
      const obs = new ResizeObserver(() => updateSize());
      if (containerRef.current) obs.observe(containerRef.current);
      return () => obs.disconnect();
    }
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Non-null updaters
  const setItemDataNotNull: Updater<ItemData> = useCallback(
    (updater) => {
      setItemData((current) => {
        if (!current) return current;
        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    [setItemData],
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

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (clickToAddItem === undefined) return;
    const stage = e.target.getStage();

    const pos = stage?.getRelativePointerPosition();
    if (!pos) return;
    const x = Math.round(pos.x);
    const z = Math.round(pos.y);

    setItemDataNotNull((itemData) => {
      itemData.Itms[1000].obj.push({
        x: x,
        z: z,
        type: clickToAddItem,
        flags: 0,
        p0: 0,
        p1: 0,
        p2: 0,
        p3: 0,
      });
    });
  }, [clickToAddItem, setItemDataNotNull]);

  const handleStageDblClick = useCallback(() => {
    setSelectedFence(undefined);
    setSelectedItem(undefined);
    setSelectedSpline(undefined);
  }, [setSelectedFence, setSelectedItem, setSelectedSpline]);

  const handleStageWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const scaleBy = 1.05;
    const stage = e.target.getStage();
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;

    const mousePointTo = {
      x: pointerPosition.x / oldScale - stage.x() / oldScale,
      y: pointerPosition.y / oldScale - stage.y() / oldScale,
    };

    const newScale =
      e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    setStage({
      scale: newScale,
      x: (pointerPosition.x / newScale - mousePointTo.x) * newScale,
      y: (pointerPosition.y / newScale - mousePointTo.y) * newScale,
    });
  }, [setStage]);

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
        {/* Render individual tiles - Bugdom 1 uses 5x5 tile system */}
        {terrainData && terrainData.Layr && (
          <IndividualTileSupertiles
            headerData={headerData}
            terrainData={terrainData}
            mapImages={mapImages}
          />
        )}

        {/* Topology / flag overlay (tiles view) */}
        {view === View.tiles && (
          <Tiles
            headerData={headerData}
            terrainData={terrainData}
            setTerrainData={setTerrainData}
            isEditingTopology={true}
          />
        )}

        {/* Bugdom 1 has no tile attributes editing - individual tiles are composed into supertiles at render time */}

        {/* Show all layers except when in tiles view */}
        {view !== View.tiles && (
          <>
            {/* Fence view - fences are primary */}
            {view === View.fences && (
              <>
                {itemData && (
                  <Items
                    headerData={headerData}
                    terrainData={terrainData}
                    itemData={itemData}
                    setItemData={setItemDataNotNull}
                  />
                )}
                {splineData && (
                  <Splines
                    splineData={splineData}
                    setSplineData={setSplineDataNotNull}
                  />
                )}
                {fenceData && (
                  <Fences
                    fenceData={fenceData}
                    setFenceData={setFenceDataNotNull}
                  />
                )}
              </>
            )}

            {/* Spline view - splines are primary */}
            {view === View.splines && (
              <>
                {itemData && (
                  <Items
                    headerData={headerData}
                    terrainData={terrainData}
                    itemData={itemData}
                    setItemData={setItemDataNotNull}
                  />
                )}
                {fenceData && (
                  <Fences
                    fenceData={fenceData}
                    setFenceData={setFenceDataNotNull}
                  />
                )}
                {splineData && (
                  <Splines
                    splineData={splineData}
                    setSplineData={setSplineDataNotNull}
                  />
                )}
              </>
            )}

            {/* Items view - items are primary */}
            {view === View.items && (
              <>
                {fenceData && (
                  <Fences
                    fenceData={fenceData}
                    setFenceData={setFenceDataNotNull}
                  />
                )}
                {splineData && (
                  <Splines
                    splineData={splineData}
                    setSplineData={setSplineDataNotNull}
                  />
                )}
                {itemData && (
                  <Items
                    headerData={headerData}
                    terrainData={terrainData}
                    itemData={itemData}
                    setItemData={setItemDataNotNull}
                  />
                )}
              </>
            )}

            {/* Supertiles view - show all */}
            {view === View.supertiles && (
              <>
                {fenceData && (
                  <Fences
                    fenceData={fenceData}
                    setFenceData={setFenceDataNotNull}
                  />
                )}
                {itemData && (
                  <Items
                    headerData={headerData}
                    terrainData={terrainData}
                    itemData={itemData}
                    setItemData={setItemDataNotNull}
                  />
                )}
                {splineData && (
                  <Splines
                    splineData={splineData}
                    setSplineData={setSplineDataNotNull}
                  />
                )}
              </>
            )}
          </>
        )}
      </Stage>
    </div>
  );
}
