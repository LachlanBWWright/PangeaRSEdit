import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { BufferGeometry, Float32BufferAttribute } from "three";
import { Globals } from "@/data/globals/globals";
import { ShowAccessibilityOverlay } from "@/data/tiles/tileAtoms";
import type {
  HeaderData,
  TerrainData,
  StandardHeader,
} from "@/python/structSpecs/LevelTypes";
import {
  hasAccessibleOverlayData,
  isTerrainVertexInaccessible,
} from "../utils/terrainAccessibility";

const ACCESSIBILITY_OVERLAY_HEIGHT_OFFSET = 2;

export function TerrainAccessibilityOverlay({
  headerData,
  terrainData,
}: {
  headerData: HeaderData;
  terrainData: TerrainData;
}) {
  const globals = useAtomValue(Globals);
  const showAccessibilityOverlay = useAtomValue(ShowAccessibilityOverlay);

  const header: StandardHeader | undefined = headerData.Hedr?.[1000]?.obj;
  const floorHeights = terrainData.YCrd?.[1000]?.obj;
  const roofHeights = terrainData.YCrd?.[1001]?.obj;
  const mapTileSize = header?.tileSize ?? 1;
  const yScale = globals.TILE_INGAME_SIZE / Math.max(1, mapTileSize);

  const geometry = useMemo(() => {
    if (
      !showAccessibilityOverlay ||
      !header ||
      !hasAccessibleOverlayData(
        globals.GAME_TYPE,
        header,
        floorHeights,
        roofHeights,
      ) ||
      !floorHeights
    ) {
      return null;
    }

    const mapWidth = header.mapWidth;
    const mapHeight = header.mapHeight;
    const rowWidth = mapWidth + 1;
    const positions: number[] = [];

    for (let z = 0; z < mapHeight; z++) {
      for (let x = 0; x < mapWidth; x++) {
        const topLeftIndex = z * rowWidth + x;
        const topRightIndex = topLeftIndex + 1;
        const bottomLeftIndex = (z + 1) * rowWidth + x;
        const bottomRightIndex = bottomLeftIndex + 1;
        const vertexIndices = [
          topLeftIndex,
          topRightIndex,
          bottomLeftIndex,
          bottomRightIndex,
        ];

        const topLeftFloor = floorHeights[topLeftIndex];
        const topRightFloor = floorHeights[topRightIndex];
        const bottomLeftFloor = floorHeights[bottomLeftIndex];
        const bottomRightFloor = floorHeights[bottomRightIndex];
        if (
          topLeftFloor === undefined ||
          topRightFloor === undefined ||
          bottomLeftFloor === undefined ||
          bottomRightFloor === undefined
        ) {
          continue;
        }

        const inaccessible = vertexIndices.some((vertexIndex) =>
          isTerrainVertexInaccessible(
            globals.GAME_TYPE,
            floorHeights[vertexIndex] ?? 0,
            roofHeights?.[vertexIndex],
          ),
        );

        if (!inaccessible) {
          continue;
        }

        const left = x * globals.TILE_INGAME_SIZE;
        const right = (x + 1) * globals.TILE_INGAME_SIZE;
        const top = z * globals.TILE_INGAME_SIZE;
        const bottom = (z + 1) * globals.TILE_INGAME_SIZE;

        positions.push(
          left,
          topLeftFloor * yScale + ACCESSIBILITY_OVERLAY_HEIGHT_OFFSET,
          top,
          right,
          topRightFloor * yScale + ACCESSIBILITY_OVERLAY_HEIGHT_OFFSET,
          top,
          left,
          bottomLeftFloor * yScale + ACCESSIBILITY_OVERLAY_HEIGHT_OFFSET,
          bottom,
          right,
          topRightFloor * yScale + ACCESSIBILITY_OVERLAY_HEIGHT_OFFSET,
          top,
          right,
          bottomRightFloor * yScale + ACCESSIBILITY_OVERLAY_HEIGHT_OFFSET,
          bottom,
          left,
          bottomLeftFloor * yScale + ACCESSIBILITY_OVERLAY_HEIGHT_OFFSET,
          bottom,
        );
      }
    }

    if (positions.length === 0) {
      return null;
    }

    const bufferGeometry = new BufferGeometry();
    bufferGeometry.setAttribute(
      "position",
      new Float32BufferAttribute(positions, 3),
    );
    bufferGeometry.computeVertexNormals();
    return bufferGeometry;
  }, [
    floorHeights,
    globals,
    header,
    roofHeights,
    showAccessibilityOverlay,
    yScale,
  ]);

  if (!geometry) {
    return null;
  }

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#ff4040" transparent={true} opacity={0.35} />
    </mesh>
  );
}
