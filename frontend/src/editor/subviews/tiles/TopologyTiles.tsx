import { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { Layer, Image, Circle, Rect } from "react-konva";
import { Updater } from "use-immer";
import {
  CurrentTopologyDualEditMode,
  CurrentTopologyHeightmapDisplayMode,
  CurrentTopologyLayerEditMode,
  CurrentTopologyBrushMode,
  CurrentTopologyValueMode,
  TopologyBrushMode,
  TopologyBrushRadius,
  TopologyOpacity,
  TopologyValue,
} from "../../../data/tiles/tileAtoms";
import { useAtomValue } from "jotai";
import { Globals } from "../../../data/globals/globals";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createImageCanvas, elevationToRGBA } from "./tilesUtils";
import {
  calculateBrushPixels,
  applyTopologyBrushToSnapshot,
  cloneHeightArray,
  mergeBrushPixels,
  PixelType,
  StrokePoint,
} from "../../utils/topologyBrushUtils";
import {
  getBrushRadiusPixels,
  getDisplayedHeightmap,
  getMapSizeFromHeader,
} from "@/editor/subviews/tiles/topologyTilesState";

interface BrushPreviewPoint {
  x: number;
  y: number;
  scale: number;
}

interface StrokeState {
  floorSnapshot: number[];
  roofSnapshot: number[] | undefined;
  draftFloor: number[];
  draftRoof: number[] | undefined;
  pixels: PixelType[];
  lastPoint: StrokePoint;
  brushRadiusPixels: number;
}

export function TopologyTiles({
  headerData,
  terrainData,
  setTerrainData,
  isEditingTopology,
}: {
  headerData: HeaderData;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  isEditingTopology: boolean;
}) {
  const currentTopologyBrushMode = useAtomValue(CurrentTopologyBrushMode);
  const currentTopologyValueMode = useAtomValue(CurrentTopologyValueMode);
  const currentLayerEditMode = useAtomValue(CurrentTopologyLayerEditMode);
  const currentDualEditMode = useAtomValue(CurrentTopologyDualEditMode);
  const heightmapDisplayMode = useAtomValue(
    CurrentTopologyHeightmapDisplayMode,
  );
  const topologyValue = useAtomValue(TopologyValue);
  const topologyBrushRadius = useAtomValue(TopologyBrushRadius);
  const globals = useAtomValue(Globals);
  const opacity = useAtomValue(TopologyOpacity);
  const [brushPreviewPoint, setBrushPreviewPoint] =
    useState<BrushPreviewPoint | null>(null);
  const [strokeState, setStrokeState] = useState<StrokeState | null>(null);

  const header = useMemo(() => headerData.Hedr[1000].obj, [headerData.Hedr]);
  const yCrdData = terrainData.YCrd?.[1000]?.obj;
  const roofYCrdData = terrainData.YCrd?.[1001]?.obj;
  const activeFloorHeights = strokeState?.draftFloor ?? yCrdData;
  const activeRoofHeights = strokeState?.draftRoof ?? roofYCrdData;

  const displayedHeightmap = useMemo(() => {
    return getDisplayedHeightmap(
      activeFloorHeights,
      activeRoofHeights,
      heightmapDisplayMode,
      currentLayerEditMode,
    );
  }, [
    activeFloorHeights,
    activeRoofHeights,
    currentLayerEditMode,
    heightmapDisplayMode,
  ]);

  const coordColours = useMemo(() => {
    if (!displayedHeightmap || displayedHeightmap.length === 0)
      return [128, 128, 128, 255];
    return displayedHeightmap.flatMap((e) => elevationToRGBA(header, e));
  }, [displayedHeightmap, header]);

  const imgCanvas = useMemo(() => {
    if (!displayedHeightmap || displayedHeightmap.length === 0) {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      return canvas;
    }
    const result = createImageCanvas(
      header.mapWidth + 1,
      header.mapHeight + 1,
      coordColours,
    );
    if (result.isErr()) {
      console.error("Failed to create image canvas:", result.error.message);
      return null;
    }
    return result.value;
  }, [coordColours, displayedHeightmap, header]);

  const updateStroke = useCallback(
    (
      centerX: number,
      centerY: number,
      stageScale: number,
      previousStroke: StrokeState | null,
    ) => {
      const brushRadiusPixels =
        previousStroke?.brushRadiusPixels ??
        getBrushRadiusPixels(
          topologyBrushRadius,
          globals.TILE_SIZE,
          stageScale,
        );
      const baseFloor =
        previousStroke?.floorSnapshot ?? cloneHeightArray(yCrdData);
      if (!baseFloor || baseFloor.length === 0) return null;
      const baseRoof =
        previousStroke?.roofSnapshot ?? cloneHeightArray(roofYCrdData);
      const lineStart = previousStroke?.lastPoint;
      const lineEnd = { x: centerX, y: centerY };
      const brushConfig = {
        centerX,
        centerY,
        radius: brushRadiusPixels,
        brushMode: currentTopologyBrushMode,
        valueMode: currentTopologyValueMode,
        value: topologyValue,
        header,
        globals,
        tileSize: globals.TILE_SIZE,
        lineStart,
        lineEnd,
      };
      const nextPixels = calculateBrushPixels(brushConfig);
      const pixels = mergeBrushPixels([
        previousStroke?.pixels ?? [],
        nextPixels,
      ]);
      const draft = applyTopologyBrushToSnapshot(
        baseFloor,
        baseRoof,
        pixels,
        brushConfig,
        currentLayerEditMode,
        currentDualEditMode,
      );

      return {
        floorSnapshot: baseFloor,
        roofSnapshot: baseRoof,
        draftFloor: draft.floor,
        draftRoof: draft.roof,
        pixels,
        lastPoint: lineEnd,
        brushRadiusPixels,
      };
    },
    [
      currentDualEditMode,
      currentLayerEditMode,
      currentTopologyBrushMode,
      currentTopologyValueMode,
      globals,
      header,
      roofYCrdData,
      topologyBrushRadius,
      topologyValue,
      yCrdData,
    ],
  );

  const commitStroke = useCallback(() => {
    if (!strokeState) return;
    setTerrainData((data) => {
      if (!data.YCrd?.[1000]?.obj) return;
      data.YCrd[1000].obj = strokeState.draftFloor;
      if (strokeState.draftRoof && data.YCrd?.[1001]?.obj)
        data.YCrd[1001].obj = strokeState.draftRoof;
    });
    setStrokeState(null);
  }, [setTerrainData, strokeState]);

  useEffect(() => {
    if (!strokeState) return;
    const handleMouseUp = () => {
      commitStroke();
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [commitStroke, strokeState]);

  const previewSize =
    brushPreviewPoint === null
      ? 0
      : (strokeState?.brushRadiusPixels ??
        getBrushRadiusPixels(
          topologyBrushRadius,
          globals.TILE_SIZE,
          brushPreviewPoint.scale,
        ));
  const showBrushPreview = isEditingTopology && brushPreviewPoint !== null;
  const mapSize = getMapSizeFromHeader(header);

  return (
    <Layer imageSmoothingEnabled={false}>
      <Image
        x={0}
        y={0}
        opacity={opacity}
        width={mapSize.width * globals.TILE_SIZE}
        height={mapSize.height * globals.TILE_SIZE}
        onMouseDown={(e) => {
          if (!isEditingTopology) return;
          const stage = e.target.getStage();
          const pos = stage?.getRelativePointerPosition();
          const stageScale = stage?.scaleX() ?? 1;
          if (!pos) return;
          const centerX = Math.round(pos.x);
          const centerY = Math.round(pos.y);
          setBrushPreviewPoint({ x: centerX, y: centerY, scale: stageScale });
          setStrokeState(updateStroke(centerX, centerY, stageScale, null));
        }}
        onMouseMove={(e) => {
          const stage = e.target.getStage();
          const pos = stage?.getRelativePointerPosition();
          const stageScale = stage?.scaleX() ?? 1;
          if (!pos) return;
          const centerX = Math.round(pos.x);
          const centerY = Math.round(pos.y);
          setBrushPreviewPoint({ x: centerX, y: centerY, scale: stageScale });
          if (!isEditingTopology || !strokeState) return;
          setStrokeState(
            updateStroke(centerX, centerY, stageScale, strokeState),
          );
        }}
        onMouseUp={() => {
          commitStroke();
        }}
        onMouseLeave={() => {
          setBrushPreviewPoint(null);
        }}
        image={imgCanvas ?? undefined}
      />
      {showBrushPreview &&
        (currentTopologyBrushMode === TopologyBrushMode.CIRCLE_BRUSH ? (
          <Circle
            x={brushPreviewPoint.x}
            y={brushPreviewPoint.y}
            radius={previewSize}
            stroke="#44ff44"
            strokeWidth={2}
            dash={[6, 4]}
            listening={false}
            perfectDrawEnabled={false}
          />
        ) : (
          <Rect
            x={brushPreviewPoint.x - previewSize}
            y={brushPreviewPoint.y - previewSize}
            width={previewSize * 2}
            height={previewSize * 2}
            stroke="#44ff44"
            strokeWidth={2}
            dash={[6, 4]}
            listening={false}
            perfectDrawEnabled={false}
          />
        ))}
    </Layer>
  );
}
