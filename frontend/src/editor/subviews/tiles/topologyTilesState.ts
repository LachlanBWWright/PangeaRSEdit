import type { HeaderData } from "@/python/structSpecs/LevelTypes";
import {
  TopologyHeightmapDisplayMode,
  TopologyLayerEditMode,
} from "@/data/tiles/tileAtoms";

export function getDisplayedHeightmap(
  floorHeights: number[] | undefined,
  roofHeights: number[] | undefined,
  heightmapDisplayMode: TopologyHeightmapDisplayMode,
  currentLayerEditMode: TopologyLayerEditMode,
): number[] | undefined {
  if (!floorHeights || floorHeights.length === 0) {
    return floorHeights;
  }
  if (!roofHeights || roofHeights.length === 0) {
    return floorHeights;
  }
  if (heightmapDisplayMode === TopologyHeightmapDisplayMode.FLOOR) {
    return floorHeights;
  }
  if (heightmapDisplayMode === TopologyHeightmapDisplayMode.ROOF) {
    return roofHeights;
  }
  return currentLayerEditMode === TopologyLayerEditMode.ROOF
    ? roofHeights
    : floorHeights;
}

export function getBrushRadiusPixels(
  topologyBrushRadius: number,
  tileSize: number,
  stageScale: number,
): number {
  return (
    ((Math.max(1, topologyBrushRadius) - 1) * tileSize) /
    Math.max(1, stageScale)
  );
}

export function getMapSizeFromHeader(header: HeaderData["Hedr"][1000]["obj"]): {
  width: number;
  height: number;
} {
  return {
    width: header.mapWidth + 1,
    height: header.mapHeight + 1,
  };
}
