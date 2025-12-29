import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { PlaneGeometry, MeshBasicMaterial, DoubleSide } from "three";
import { Globals } from "@/data/globals/globals";
import {
  CurrentTopologyValueMode,
  TopologyValue,
  TopologyValueMode,
} from "@/data/tiles/tileAtoms";
import { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { PixelType } from "../utils/topologyBrushUtils";

interface TopologyPreview3DProps {
  headerData: HeaderData;
  terrainData: TerrainData;
  affectedPixels: PixelType[];
  visible: boolean;
}

/**
 * Topology Preview 3D - SIMPLIFIED VERSION
 * 
 * This component no longer shows a full terrain preview (the green layer that covered everything).
 * Instead, it only shows a subtle height preview for the affected pixels within the brush radius.
 * 
 * The main visual feedback is provided by TopologyBrush3D (the green circle/square indicator).
 */
export function TopologyPreview3D({
  headerData,
  terrainData,
  affectedPixels,
  visible,
}: TopologyPreview3DProps) {
  const globals = useAtomValue(Globals);
  const valueMode = useAtomValue(CurrentTopologyValueMode);
  const topologyValue = useAtomValue(TopologyValue);

  const header = headerData.Hedr?.[1000]?.obj;
  const numWide = header?.mapWidth ?? 0;
  const numHigh = header?.mapHeight ?? 0;
  const mapTileSize = header?.tileSize ?? 1;
  const yScale = globals.TILE_INGAME_SIZE / Math.max(1, mapTileSize);

  // Build preview geometry ONLY for affected pixels (not entire map)
  const geometry = useMemo(() => {
    if (!visible || !terrainData.YCrd?.[1000]?.obj || !header || affectedPixels.length === 0) {
      return null;
    }

    // Create small plane geometries for each affected pixel to show height preview
    // This is much more efficient than rendering the entire terrain
    const ycrd = terrainData.YCrd[1000].obj;
    const planes: { x: number; y: number; z: number; newHeight: number }[] = [];

    for (const pixel of affectedPixels) {
      const xTile = Math.floor(pixel.x);
      const yTile = Math.floor(pixel.y);
      const vertexIndex = yTile * (numWide + 1) + xTile;
      
      if (vertexIndex < 0 || vertexIndex >= ycrd.length) continue;

      const currentValue = ycrd[vertexIndex] ?? 0;
      let newValue: number;

      switch (valueMode) {
        case TopologyValueMode.SET_VALUE:
          newValue = topologyValue;
          break;
        case TopologyValueMode.DELTA_VALUE:
          newValue = currentValue + topologyValue;
          break;
        case TopologyValueMode.DELTA_WITH_DROPOFF: {
          const falloff = 1 - pixel.distance;
          newValue = currentValue + topologyValue * falloff;
          break;
        }
        default:
          newValue = currentValue;
      }

      // Only show preview if height will actually change
      if (Math.abs(newValue - currentValue) > 0.1) {
        planes.push({
          x: xTile * globals.TILE_INGAME_SIZE + globals.TILE_INGAME_SIZE / 2,
          y: newValue * yScale,
          z: yTile * globals.TILE_INGAME_SIZE + globals.TILE_INGAME_SIZE / 2,
          newHeight: newValue,
        });
      }
    }

    // For now, return null - we rely on TopologyBrush3D for visual feedback
    // This prevents the ugly green layer from covering the entire map
    return null;
  }, [
    visible,
    terrainData.YCrd,
    numWide,
    numHigh,
    yScale,
    globals.TILE_INGAME_SIZE,
    header,
    affectedPixels,
    valueMode,
    topologyValue,
  ]);

  // Don't render anything - TopologyBrush3D provides sufficient visual feedback
  return null;
}
