import {
  TileAttribute,
  TerrainData,
  HeaderData,
} from "@/python/structSpecs/LevelTypes";
import { Layer, Image, Circle, Rect } from "react-konva";
import { Updater } from "use-immer";
import {
  CurrentTopologyBrushMode,
  CurrentTopologyValueMode,
  TopologyBrushMode,
  TopologyValueMode,
  TileViewMode,
  TileViews,
  TopologyBrushRadius,
  TopologyOpacity,
  TopologyValue,
} from "../../data/tiles/tileAtoms";
import { useAtomValue } from "jotai";
import { Globals } from "../../data/globals/globals";
import { useMemo, useState } from "react";
import { createImageCanvas } from "./tiles/tilesUtils";
import { elevationToRGBA } from "./tiles/tilesUtils";
import { calculateBrushPixels, applyTopologyBrush, PixelType } from "../utils/topologyBrushUtils";
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
  const topologyValue = useAtomValue(TopologyValue);
  const topologyBrushRadius = useAtomValue(TopologyBrushRadius);
  const globals = useAtomValue(Globals);
  const opacity = useAtomValue(TopologyOpacity);
  const [isDragging, setIsDragging] = useState(false);
  const [lastBrushPoint, setLastBrushPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [brushPreviewPoint, setBrushPreviewPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const header = useMemo(() => headerData.Hedr[1000].obj, [headerData.Hedr]);

  // Guard against missing or empty YCrd data
  const yCrdData = terrainData.YCrd?.[1000]?.obj;

  const coordColours = useMemo(() => {
    if (!yCrdData || yCrdData.length === 0) {
      // Return a minimal valid array for empty data
      return [128, 128, 128, 255];
    }
    return yCrdData.flatMap((e) => elevationToRGBA(header, e));
  }, [yCrdData, header]);

  const imgCanvas = useMemo(() => {
    // Guard against empty data - create a 1x1 placeholder
    if (!yCrdData || yCrdData.length === 0) {
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
  }, [header, coordColours, yCrdData]);

  const setPixels = (pixelList: PixelType[]) => {
    // Guard against missing YCrd data
    if (!yCrdData || yCrdData.length === 0) return;

    setTerrainData((data) => {
      if (!data.YCrd?.[1000]?.obj) return;

      // Use shared brush application utility
      applyTopologyBrush(data.YCrd[1000].obj, pixelList, {
        centerX: 0, // Not used in applyTopologyBrush
        centerY: 0, // Not used in applyTopologyBrush
        radius: (topologyBrushRadius - 1) * globals.TILE_SIZE,
        brushMode: currentTopologyBrushMode,
        valueMode: currentTopologyValueMode,
        value: topologyValue,
        header,
        globals,
        tileSize: globals.TILE_SIZE,
      });
    });
  };

  const applyBrushAt = (
    centerX: number,
    centerY: number,
    lineStart?: { x: number; y: number },
  ) => {
    const radius = (topologyBrushRadius - 1) * globals.TILE_SIZE;
    const pixelList = calculateBrushPixels({
      centerX,
      centerY,
      radius,
      brushMode: currentTopologyBrushMode,
      valueMode: currentTopologyValueMode,
      value: topologyValue,
      header,
      globals,
      tileSize: globals.TILE_SIZE,
      lineStart,
      lineEnd: { x: centerX, y: centerY },
    });
    setPixels(pixelList);
  };

  const previewSize = (topologyBrushRadius - 1) * globals.TILE_SIZE;
  const showBrushPreview = isEditingTopology && brushPreviewPoint !== null;

  return (
    <Layer imageSmoothingEnabled={false}>
      <Image
        x={0}
        y={0}
        opacity={opacity}
        width={(header.mapWidth + 1) * globals.TILE_SIZE}
        height={(header.mapHeight + 1) * globals.TILE_SIZE}
        onClick={(e) => {
          if (!isEditingTopology) return;
          const pos = e.target.getStage()?.getRelativePointerPosition();
          if (!pos) return;

          const centerX = Math.round(pos.x);
          const centerY = Math.round(pos.y);
          applyBrushAt(centerX, centerY);
        }}
        onMouseDown={(e) => {
          if (!isEditingTopology) return;
          const pos = e.target.getStage()?.getRelativePointerPosition();
          if (!pos) return;
          const centerX = Math.round(pos.x);
          const centerY = Math.round(pos.y);
          setBrushPreviewPoint({ x: centerX, y: centerY });
          setIsDragging(true);
          setLastBrushPoint({ x: centerX, y: centerY });
          applyBrushAt(centerX, centerY);
        }}
        onMouseMove={(e) => {
          const pos = e.target.getStage()?.getRelativePointerPosition();
          if (!pos) return;
          const centerX = Math.round(pos.x);
          const centerY = Math.round(pos.y);
          setBrushPreviewPoint({ x: centerX, y: centerY });
          if (!isEditingTopology || !isDragging) return;
          const lineStart =
            currentTopologyValueMode === TopologyValueMode.SET_VALUE
              ? undefined
              : lastBrushPoint ?? { x: centerX, y: centerY };
          applyBrushAt(centerX, centerY, lineStart);
          setLastBrushPoint({ x: centerX, y: centerY });
        }}
        onMouseUp={() => {
          setIsDragging(false);
          setLastBrushPoint(null);
        }}
        onMouseLeave={() => {
          setIsDragging(false);
          setLastBrushPoint(null);
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
