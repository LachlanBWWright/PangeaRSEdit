import { Image, Layer } from "react-konva";
import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { ShowAccessibilityOverlay } from "@/data/tiles/tileAtoms";
import { Globals } from "@/data/globals/globals";
import type {
  HeaderData,
  TerrainData,
  StandardHeader,
} from "@/python/structSpecs/LevelTypes";
import { createImageCanvas } from "./tiles/tilesUtils";
import {
  supportsAccessibilityOverlay,
  isTerrainVertexInaccessible,
} from "../utils/terrainAccessibility";

const ACCESSIBILITY_MASK_RGBA: [number, number, number, number] = [255, 64, 64, 140];
const TRANSPARENT_RGBA: [number, number, number, number] = [0, 0, 0, 0];

export function AccessibilityMaskOverlay({
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

  const overlayCanvas = useMemo(() => {
    if (
      !showAccessibilityOverlay ||
      !header ||
      !floorHeights ||
      !supportsAccessibilityOverlay(globals.GAME_TYPE)
    ) {
      return null;
    }

    const colors: number[] = [];
    const rowWidth = header.mapWidth + 1;
    for (let row = 0; row < header.mapHeight; row++) {
      for (let col = 0; col < header.mapWidth; col++) {
        const topLeft = row * rowWidth + col;
        const topRight = topLeft + 1;
        const bottomLeft = (row + 1) * rowWidth + col;
        const bottomRight = bottomLeft + 1;
        const inaccessible = [
          topLeft,
          topRight,
          bottomLeft,
          bottomRight,
        ].some((index) =>
          isTerrainVertexInaccessible(
            globals.GAME_TYPE,
            floorHeights[index] ?? 0,
            roofHeights?.[index],
          ),
        );

        colors.push(...(inaccessible ? ACCESSIBILITY_MASK_RGBA : TRANSPARENT_RGBA));
      }
    }

    const result = createImageCanvas(
      header.mapWidth,
      header.mapHeight,
      colors,
    );
    return result.isOk() ? result.value : null;
  }, [floorHeights, globals.GAME_TYPE, header, roofHeights, showAccessibilityOverlay]);

  if (!overlayCanvas || !header) {
    return null;
  }

  return (
    <Layer imageSmoothingEnabled={false}>
      <Image
        x={0}
        y={0}
        width={header.mapWidth * globals.TILE_SIZE}
        height={header.mapHeight * globals.TILE_SIZE}
        image={overlayCanvas}
        listening={false}
      />
    </Layer>
  );
}
