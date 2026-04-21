import {
  TileAttribute,
  TerrainData,
  HeaderData,
} from "@/python/structSpecs/LevelTypes";
import { Layer, Image, Circle, Rect } from "react-konva";
import { Updater } from "use-immer";
import {
  CurrentTopologyDualEditMode,
  CurrentTopologyHeightmapDisplayMode,
  CurrentTopologyLayerEditMode,
  CurrentTopologyBrushMode,
  CurrentTopologyValueMode,
  TopologyBrushMode,
  TopologyHeightmapDisplayMode,
  TopologyLayerEditMode,
  TileViewMode,
  TileViews,
  TopologyBrushRadius,
  TopologyOpacity,
  TopologyValue,
} from "../../data/tiles/tileAtoms";
import { useAtomValue } from "jotai";
import { Globals } from "../../data/globals/globals";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createImageCanvas } from "./tiles/tilesUtils";
import { elevationToRGBA } from "./tiles/tilesUtils";
import {
  calculateBrushPixels,
  applyTopologyBrushToSnapshot,
  cloneHeightArray,
  mergeBrushPixels,
  PixelType,
  StrokePoint,
} from "../utils/topologyBrushUtils";
import { FlagTileEditor } from "./tiles/FlagTileEditor";

/* 

  Tile attribs p0 and p1 are NOT used!

TILE_ATTRIB_BLANK=1, 
TILE_ATTRIB_ELECTROCUTE_AREA0=(1<<1),
TILE_ATTRIB_ELECTROCUTE_AREA1=(1<<2)

*/

export function Tiles({
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
  const tileViewMode = useAtomValue(TileViewMode);

  const tileGrid = useMemo(() => {
    // If no Atrb data or Layr doesn't reference Atrb, return empty array
    const layrData = terrainData.Layr?.[1000]?.obj;
    const atrbData = terrainData.Atrb?.[1000]?.obj;
    if (!atrbData || !layrData) {
      return [];
    }
    return layrData
      .map((atrbIdx: number) => atrbData[atrbIdx])
      .filter((tile): tile is TileAttribute => tile !== undefined);
  }, [terrainData.Layr, terrainData.Atrb]);

  // For Topology view, check if YCrd data exists
  if (tileViewMode === TileViews.Topology) {
    // Check if YCrd data exists and has content
    if (!terrainData.YCrd?.[1000]?.obj?.length) {
      return <Layer>{/* No topology data available for this game */}</Layer>;
    }
    return (
      <TopologyTiles
        headerData={headerData}
        terrainData={terrainData}
        setTerrainData={setTerrainData}
        isEditingTopology={isEditingTopology}
      />
    );
  }

  // For other tile views, check if tileGrid has data
  if (!tileGrid.length) {
    return (
      <Layer>{/* No tile attribute data available for this game */}</Layer>
    );
  }

  if (tileViewMode === TileViews.Flags)
    return (
      <FlagTileEditor
        headerData={headerData}
        setTerrainData={setTerrainData}
        tileGrid={tileGrid}
        flagBit={1}
        flagToColour={(flag) => (flag & 1 ? [255, 255, 255, 255] : [0, 0, 0, 0])}
      />
    );
  if (tileViewMode === TileViews.ElectricFloor0)
    return (
      <FlagTileEditor
        headerData={headerData}
        setTerrainData={setTerrainData}
        tileGrid={tileGrid}
        flagBit={1 << 1}
        flagToColour={(flag) => (flag & (1 << 1) ? [255, 255, 255, 255] : [0, 0, 0, 0])}
      />
    );

  return (
    <FlagTileEditor
      headerData={headerData}
      setTerrainData={setTerrainData}
      tileGrid={tileGrid}
      flagBit={1 << 2}
      flagToColour={(flag) => (flag & (1 << 2) ? [255, 255, 255, 255] : [0, 0, 0, 0])}
    />
  );
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
  const heightmapDisplayMode = useAtomValue(CurrentTopologyHeightmapDisplayMode);
  const topologyValue = useAtomValue(TopologyValue);
  const topologyBrushRadius = useAtomValue(TopologyBrushRadius);
  const globals = useAtomValue(Globals);
  const opacity = useAtomValue(TopologyOpacity);
  const [brushPreviewPoint, setBrushPreviewPoint] = useState<{
    x: number;
    y: number;
    scale: number;
  } | null>(null);
  const [strokeState, setStrokeState] = useState<{
    floorSnapshot: number[];
    roofSnapshot: number[] | undefined;
    draftFloor: number[];
    draftRoof: number[] | undefined;
    pixels: PixelType[];
    lastPoint: StrokePoint;
    brushRadiusPixels: number;
  } | null>(null);

  const header = useMemo(() => headerData.Hedr[1000].obj, [headerData.Hedr]);

  // Guard against missing or empty YCrd data
  const yCrdData = terrainData.YCrd?.[1000]?.obj;
  const roofYCrdData = terrainData.YCrd?.[1001]?.obj;
  const activeFloorHeights = strokeState?.draftFloor ?? yCrdData;
  const activeRoofHeights = strokeState?.draftRoof ?? roofYCrdData;

  const displayedHeightmap = useMemo(() => {
    if (!activeFloorHeights || activeFloorHeights.length === 0) {
      return activeFloorHeights;
    }

    if (!activeRoofHeights || activeRoofHeights.length === 0) {
      return activeFloorHeights;
    }

    if (heightmapDisplayMode === TopologyHeightmapDisplayMode.FLOOR) {
      return activeFloorHeights;
    }

    if (heightmapDisplayMode === TopologyHeightmapDisplayMode.ROOF) {
      return activeRoofHeights;
    }

    return currentLayerEditMode === TopologyLayerEditMode.ROOF
      ? activeRoofHeights
      : activeFloorHeights;
  }, [
    activeFloorHeights,
    activeRoofHeights,
    currentLayerEditMode,
    heightmapDisplayMode,
  ]);

  const coordColours = useMemo(() => {
    if (!displayedHeightmap || displayedHeightmap.length === 0) {
      // Return a minimal valid array for empty data
      return [128, 128, 128, 255];
    }
    return displayedHeightmap.flatMap((e) => elevationToRGBA(header, e));
  }, [displayedHeightmap, header]);

  const imgCanvas = useMemo(() => {
    // Guard against empty data - create a 1x1 placeholder
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

  const updateStroke = useCallback((
    centerX: number,
    centerY: number,
    stageScale: number,
    previousStroke: typeof strokeState,
  ) => {
    const brushRadiusPixels =
      previousStroke?.brushRadiusPixels ??
      (((Math.max(1, topologyBrushRadius) - 1) * globals.TILE_SIZE) /
        Math.max(1, stageScale));
    const baseFloor = previousStroke?.floorSnapshot ?? cloneHeightArray(yCrdData);
    if (!baseFloor || baseFloor.length === 0) {
      return null;
    }
    const baseRoof = previousStroke?.roofSnapshot ?? cloneHeightArray(roofYCrdData);
    const lineStart = previousStroke?.lastPoint;
    const nextPixels = calculateBrushPixels({
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
      lineEnd: { x: centerX, y: centerY },
    });
    const pixels = mergeBrushPixels([
      previousStroke?.pixels ?? [],
      nextPixels,
    ]);
    const draft = applyTopologyBrushToSnapshot(
      baseFloor,
      baseRoof,
      pixels,
      {
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
        lineEnd: { x: centerX, y: centerY },
      },
      currentLayerEditMode,
      currentDualEditMode,
    );

    return {
      floorSnapshot: baseFloor,
      roofSnapshot: baseRoof,
      draftFloor: draft.floor,
      draftRoof: draft.roof,
      pixels,
      lastPoint: { x: centerX, y: centerY },
      brushRadiusPixels,
    };
  }, [
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
  ]);

  const commitStroke = useCallback(() => {
    if (!strokeState) {
      return;
    }

    setTerrainData((data) => {
      if (!data.YCrd?.[1000]?.obj) {
        return;
      }

      data.YCrd[1000].obj = strokeState.draftFloor;
      if (strokeState.draftRoof && data.YCrd?.[1001]?.obj) {
        data.YCrd[1001].obj = strokeState.draftRoof;
      }
    });

    setStrokeState(null);
  }, [setTerrainData, strokeState]);

  useEffect(() => {
    if (!strokeState) {
      return;
    }

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
          (((Math.max(1, topologyBrushRadius) - 1) * globals.TILE_SIZE) /
            Math.max(1, brushPreviewPoint.scale)));
  const showBrushPreview = isEditingTopology && brushPreviewPoint !== null;

  return (
    <Layer imageSmoothingEnabled={false}>
      <Image
        x={0}
        y={0}
        opacity={opacity}
        width={(header.mapWidth + 1) * globals.TILE_SIZE}
        height={(header.mapHeight + 1) * globals.TILE_SIZE}
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
          setStrokeState(updateStroke(centerX, centerY, stageScale, strokeState));
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
