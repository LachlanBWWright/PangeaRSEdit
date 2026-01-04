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
import { useAtomValue, useSetAtom } from "jotai";
import { useRef, useCallback, useState, useEffect } from "react";
import { Stage } from "react-konva";
import { Updater } from "use-immer";
import { Items } from "../subviews/Items";
import { Fences } from "../subviews/Fences";
import { Splines } from "../subviews/Splines";
import { WaterBodies } from "../subviews/WaterBodies";
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
import { View } from "../viewEnum";

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
}: OttoMaticKonvaViewProps) {
  const setSelectedFence = useSetAtom(SelectedFence);
  const setSelectedItem = useSetAtom(SelectedItem);
  const setSelectedSpline = useSetAtom(SelectedSpline);
  const setSelectedWaterBody = useSetAtom(SelectedWaterBody);
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
        onClick={(e) => {
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
        }}
        onDblClick={() => {
          setSelectedFence(undefined);
          setSelectedItem(undefined);
          setSelectedSpline(undefined);
          setSelectedWaterBody(null);
        }}
        onWheel={(e) => {
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
        }}
      >
        {/* Render pre-composed supertiles (Otto uses STgd) */}
        {terrainData && terrainData.STgd && (
          <StandardSupertiles
            headerData={headerData}
            terrainData={terrainData}
            mapImages={mapImages}
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

        {/* Show all layers except when in tiles view */}
        {view !== View.tiles && (
          <>
            {liquidData && (
              <WaterBodies
                liquidData={liquidData}
                setLiquidData={setLiquidDataNotNull}
              />
            )}
            {fenceData && (
              <Fences
                fenceData={fenceData}
                setFenceData={setFenceDataNotNull}
              />
            )}
            {itemData && (
              <Items itemData={itemData} setItemData={setItemDataNotNull} />
            )}
            {splineData && (
              <Splines
                splineData={splineData}
                setSplineData={setSplineDataNotNull}
              />
            )}
          </>
        )}

        {/* Fence view - fences are primary */}
        {view === View.fences && (
          <>
            {liquidData && (
              <WaterBodies
                liquidData={liquidData}
                setLiquidData={setLiquidDataNotNull}
              />
            )}
            {itemData && (
              <Items itemData={itemData} setItemData={setItemDataNotNull} />
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

        {/* Water view - water is primary */}
        {view === View.water && (
          <>
            {fenceData && (
              <Fences
                fenceData={fenceData}
                setFenceData={setFenceDataNotNull}
              />
            )}
            {itemData && (
              <Items itemData={itemData} setItemData={setItemDataNotNull} />
            )}
            {splineData && (
              <Splines
                splineData={splineData}
                setSplineData={setSplineDataNotNull}
              />
            )}
            {liquidData && (
              <WaterBodies
                liquidData={liquidData}
                setLiquidData={setLiquidDataNotNull}
              />
            )}
          </>
        )}

        {/* Spline view - splines are primary */}
        {view === View.splines && (
          <>
            {liquidData && (
              <WaterBodies
                liquidData={liquidData}
                setLiquidData={setLiquidDataNotNull}
              />
            )}
            {itemData && (
              <Items itemData={itemData} setItemData={setItemDataNotNull} />
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
            {liquidData && (
              <WaterBodies
                liquidData={liquidData}
                setLiquidData={setLiquidDataNotNull}
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
            {itemData && (
              <Items itemData={itemData} setItemData={setItemDataNotNull} />
            )}
          </>
        )}
      </Stage>
    </div>
  );
}
