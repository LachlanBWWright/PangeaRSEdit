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
import { CanvasStageLayers, CanvasViewMode } from "./CanvasStageLayers";
import {
  HeaderData,
  ItemData,
  LiquidData,
  FenceData,
  SplineData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import {
  addPlacedItem,
  clearCanvasSelections,
  computeWheelZoomStage,
  getContainerSize,
  getPointerTilePosition,
  getStickyStageOffset,
  getTerrainContentSize,
  StageData,
} from "@/editor/canvas/konvaViewState";

type View = CanvasViewMode;

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

  const isTopologyMode = view === CanvasViewMode.tiles;

  // Compute the terrain content size for scrollable topology mode
  const contentSize = useMemo(
    () => getTerrainContentSize(headerData, globals.TILE_SIZE, stage.scale),
    [headerData, globals.TILE_SIZE, stage.scale],
  );

  useEffect(() => {
    const updateSize = () => {
      setContainerSize(getContainerSize(containerRef.current));
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
  const handleScrollContainerScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      setScrollOffset({ x: el.scrollLeft, y: el.scrollTop });
    },
    [],
  );

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (clickToAddItem === undefined) return;
      const position = getPointerTilePosition(e);
      if (!position) return;

      // Updater<T | null> can be safely cast to Updater<T> when component only renders when data is non-null
      (setItemData as Updater<ItemData>)((itemData) => { // eslint-disable-line @typescript-eslint/no-unsafe-type-assertion
        addPlacedItem(itemData, position.x, position.z, clickToAddItem);
      });
    },
    [clickToAddItem, setItemData],
  );

  const handleStageDblClick = useCallback(() => {
    clearCanvasSelections(
      setSelectedFence,
      setSelectedItem,
      setSelectedSpline,
      setSelectedWaterBody,
    );
  }, [
    setSelectedFence,
    setSelectedItem,
    setSelectedSpline,
    setSelectedWaterBody,
  ]);

  const handleStageWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      const nextStage = computeWheelZoomStage(e);
      if (nextStage) {
        setStage(nextStage);
      }
    },
    [setStage],
  );

  const stageOffset = getStickyStageOffset(isTopologyMode, scrollOffset, stage);

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
          x={stageOffset.x}
          y={stageOffset.y}
          draggable={!isTopologyMode}
          onClick={handleStageClick}
          onDblClick={handleStageDblClick}
          onWheel={handleStageWheel}
        >
          <CanvasStageLayers
            headerData={headerData}
            terrainData={terrainData}
            setTerrainData={setTerrainData}
            itemData={itemData}
            setItemData={setItemData as Updater<ItemData>} // eslint-disable-line @typescript-eslint/no-unsafe-type-assertion
            liquidData={liquidData}
            setLiquidData={setLiquidData as Updater<LiquidData>} // eslint-disable-line @typescript-eslint/no-unsafe-type-assertion
            fenceData={fenceData}
            setFenceData={setFenceData as Updater<FenceData>} // eslint-disable-line @typescript-eslint/no-unsafe-type-assertion
            splineData={splineData}
            setSplineData={setSplineData as Updater<SplineData>} // eslint-disable-line @typescript-eslint/no-unsafe-type-assertion
            mapImages={mapImages}
            view={view}
          />
        </Stage>
      </div>
    </div>
  );
}
