import { SelectedFence } from "@/data/fences/fenceAtoms";
import { ClickToAddItem, SelectedItem } from "@/data/items/itemAtoms";
import { SelectedSpline } from "@/data/splines/splineAtoms";
import { SelectedWaterBody } from "@/data/water/waterAtoms";
import { Globals } from "@/data/globals/globals";
import { useAtomValue, useSetAtom } from "jotai";
import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Stage } from "react-konva";
import Konva from "konva";
import { Updater } from "use-immer";
import { Items } from "../subviews/Items";
import { Fences } from "../subviews/Fences";
import { Splines } from "../subviews/Splines";
import { WaterBodies } from "../subviews/WaterBodies";
import { Tiles } from "../subviews/Tiles";
import { Supertiles } from "../subviews/Supertiles";
import {
  HeaderData,
  ItemData,
  LiquidData,
  FenceData,
  SplineData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";

enum View {
  fences,
  water,
  items,
  splines,
  tiles,
  supertiles,
}

export interface StageData {
  scale: number;
  x: number;
  y: number;
}

export function KonvaView({
  headerData,
  terrainData,
  setTerrainData,
  itemData,
  setItemData,
  liquidData,
  setLiquidData,
  fenceData,
  setFenceData,
  splineData,
  setSplineData,
  mapImages,
  view,
  stage,
  setStage,
}: {
  headerData: HeaderData;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  itemData: ItemData | null;
  setItemData: Updater<ItemData | null>;
  liquidData: LiquidData | null;
  setLiquidData: Updater<LiquidData | null>;
  fenceData: FenceData | null;
  setFenceData: Updater<FenceData | null>;
  splineData: SplineData | null;
  setSplineData: Updater<SplineData | null>;
  mapImages: HTMLCanvasElement[];
  view: View;
  stage: StageData;
  setStage: Updater<StageData>;
}) {
  const setSelectedFence = useSetAtom(SelectedFence);
  const setSelectedItem = useSetAtom(SelectedItem);
  const setSelectedSpline = useSetAtom(SelectedSpline);
  const setSelectedWaterBody = useSetAtom(SelectedWaterBody);
  const clickToAddItem = useAtomValue(ClickToAddItem);
  const globals = useAtomValue(Globals);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({
    width: 3000,
    height: 2000,
  });
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });

  const isTopologyMode = view === View.tiles;

  // Compute the terrain content size for scrollable topology mode
  const contentSize = useMemo(() => {
    const header = headerData.Hedr?.[1000]?.obj;
    if (!header) return { width: 3000, height: 2000 };
    return {
      width: (header.mapWidth + 1) * globals.TILE_SIZE * stage.scale,
      height: (header.mapHeight + 1) * globals.TILE_SIZE * stage.scale,
    };
  }, [headerData.Hedr, globals.TILE_SIZE, stage.scale]);

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

  // Sync scrollbars to stage offset in topology mode
  const handleScrollContainerScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setScrollOffset({ x: el.scrollLeft, y: el.scrollTop });
  }, []);

  // Create wrapper setters that handle null
  const safeSetItemData: Updater<ItemData> = (updater) => {
    setItemData((data) => {
      if (data) {
        if (typeof updater === 'function') {
          updater(data);
        }
      }
    });
  };
  
  const safeSetLiquidData: Updater<LiquidData> = (updater) => {
    setLiquidData((data) => {
      if (data) {
        if (typeof updater === 'function') {
          updater(data);
        }
      }
    });
  };
  
  const safeSetFenceData: Updater<FenceData> = (updater) => {
    setFenceData((data) => {
      if (data) {
        if (typeof updater === 'function') {
          updater(data);
        }
      }
    });
  };
  
  const safeSetSplineData: Updater<SplineData> = (updater) => {
    setSplineData((data) => {
      if (data) {
        if (typeof updater === 'function') {
          updater(data);
        }
      }
    });
  };

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (clickToAddItem === undefined) return;
    const stage = e.target.getStage();

    const pos = stage?.getRelativePointerPosition();
    if (!pos) return;
    const x = Math.round(pos.x);
    const z = Math.round(pos.y);

    safeSetItemData((itemData) => {
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
  }, [clickToAddItem, safeSetItemData]);

  const handleStageDblClick = useCallback(() => {
    setSelectedFence(undefined);
    setSelectedItem(undefined);
    setSelectedSpline(undefined);
    setSelectedWaterBody(null);
  }, [setSelectedFence, setSelectedItem, setSelectedSpline, setSelectedWaterBody]);

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
    <div
      ref={(el) => {
        scrollContainerRef.current = el;
        containerRef.current = el;
      }}
      style={{
        width: "100%",
        height: "100%",
        overflow: isTopologyMode ? "auto" : "hidden",
        position: "relative",
      }}
      onScroll={isTopologyMode ? handleScrollContainerScroll : undefined}
    >
      {/* Spacer div sets the scrollable area dimensions in topology mode */}
      {isTopologyMode && (
        <div
          style={{
            position: "absolute",
            width: Math.max(contentSize.width, containerSize.width),
            height: Math.max(contentSize.height, containerSize.height),
            pointerEvents: "none",
          }}
        />
      )}
      <div
        style={{
          width: containerSize.width,
          height: containerSize.height,
          position: "sticky",
          top: 0,
          left: 0,
          flexShrink: 0,
        }}
      >
      <Stage
        width={containerSize.width}
        height={containerSize.height}
        scaleX={stage.scale}
        scaleY={stage.scale}
        x={isTopologyMode ? -scrollOffset.x : stage.x}
        y={isTopologyMode ? -scrollOffset.y : stage.y}
        draggable={!isTopologyMode}
        onClick={handleStageClick}
        onDblClick={handleStageDblClick}
        onWheel={handleStageWheel}
      >
        {/* Render supertiles - for Bugdom 1 (has Layr) or other games (has STgd) */}
        {terrainData && (terrainData.STgd || terrainData.Layr) && (
          <Supertiles
            headerData={headerData}
            terrainData={terrainData}
            mapImages={mapImages}
          />
        )}
        {view === View.tiles && (
          <Tiles
            headerData={headerData}
            terrainData={terrainData}
            setTerrainData={setTerrainData}
            isEditingTopology={view === View.tiles}
          />
        )}
        {view === View.tiles ||
          (view === View.supertiles && (
            <>
              {liquidData && (
                <WaterBodies
                  liquidData={liquidData}
                  setLiquidData={safeSetLiquidData}
                />
              )}
              {fenceData && (
                <Fences
                  fenceData={fenceData}
                  setFenceData={safeSetFenceData}
                />
              )}
              {itemData && (
                <Items itemData={itemData} setItemData={safeSetItemData} />
              )}
              {splineData && (
                <Splines
                  splineData={splineData}
                  setSplineData={safeSetSplineData}
                />
              )}
            </>
          ))}
        {view === View.fences && (
          <>
            {liquidData && (
              <WaterBodies
                liquidData={liquidData}
                setLiquidData={safeSetLiquidData}
              />
            )}
            {itemData && (
              <Items itemData={itemData} setItemData={safeSetItemData} />
            )}
            {splineData && (
              <Splines
                splineData={splineData}
                setSplineData={safeSetSplineData}
              />
            )}
            {fenceData && (
              <Fences
                fenceData={fenceData}
                setFenceData={safeSetFenceData}
              />
            )}
          </>
        )}
        {view === View.water && (
          <>
            {fenceData && (
              <Fences
                fenceData={fenceData}
                setFenceData={safeSetFenceData}
              />
            )}
            {itemData && (
              <Items itemData={itemData} setItemData={safeSetItemData} />
            )}
            {splineData && (
              <Splines
                splineData={splineData}
                setSplineData={safeSetSplineData}
              />
            )}
            {liquidData && (
              <WaterBodies
                liquidData={liquidData}
                setLiquidData={safeSetLiquidData}
              />
            )}
          </>
        )}
        {view === View.splines && (
          <>
            {liquidData && (
              <WaterBodies
                liquidData={liquidData}
                setLiquidData={safeSetLiquidData}
              />
            )}
            {itemData && (
              <Items itemData={itemData} setItemData={safeSetItemData} />
            )}
            {fenceData && (
              <Fences
                fenceData={fenceData}
                setFenceData={safeSetFenceData}
              />
            )}
            {splineData && (
              <Splines
                splineData={splineData}
                setSplineData={safeSetSplineData}
              />
            )}
          </>
        )}
        {view === View.items && (
          <>
            {liquidData && (
              <WaterBodies
                liquidData={liquidData}
                setLiquidData={safeSetLiquidData}
              />
            )}
            {splineData && (
              <Splines
                splineData={splineData}
                setSplineData={safeSetSplineData}
              />
            )}
            {fenceData && (
              <Fences
                fenceData={fenceData}
                setFenceData={safeSetFenceData}
              />
            )}
            {itemData && (
              <Items itemData={itemData} setItemData={safeSetItemData} />
            )}
          </>
        )}
      </Stage>
      </div>
    </div>
  );
}
