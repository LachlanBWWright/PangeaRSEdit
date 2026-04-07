import React from "react";
import {
  SplineData,
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";
import { getTerrainHeightAtPoint } from "./fenceUtils/getTerrainHeightAtPoint";

interface SplineItemGeometryProps {
  splineData: SplineData;
  headerData: HeaderData;
  terrainData: TerrainData;
}

const SPLINE_ITEM_SIZE = 40; // World units for spline item cube size
const SPLINE_HEIGHT_ABOVE_TERRAIN = 15; // Offset above terrain

export const SplineItemGeometry: React.FC<SplineItemGeometryProps> = ({
  splineData,
  headerData,
  terrainData,
}) => {
  const globals = useAtomValue(Globals);

  const splines = splineData.Spln?.[1000]?.obj;
  const splineItemsBySplineIdx = splineData.SpIt;
  const splinePointsBySplineIdx = splineData.SpPt;
  const hasValidData = !!splines && !!splineItemsBySplineIdx;

  const buildItemsGroup = () => {
    if (!hasValidData || !splines) return [];
    const group: React.ReactElement[] = [];
    const scale = globals.TILE_INGAME_SIZE / globals.TILE_SIZE;

    splines.forEach((_, splineIdx) => {
      const itemsKey = 1000 + splineIdx;
      const itemsData = splineItemsBySplineIdx[itemsKey];

      if (!itemsData || !itemsData.obj) {
        return;
      }

      const splineItems = itemsData.obj;
      const pointsKey = 1000 + splineIdx;
      const pointsData = splinePointsBySplineIdx
        ? splinePointsBySplineIdx[pointsKey]
        : null;

      splineItems.forEach((item, itemIdx) => {
        let worldX: number;
        let worldZ: number;
        let terrainY: number;

        // Use spline point data if available to position along the spline path
        if (pointsData && pointsData.obj && pointsData.obj.length > 0) {
          // placement is 0-1, convert to array index
          const pointIdx = Math.floor(
            item.placement * (pointsData.obj.length - 1),
          );
          const clampedIdx = Math.max(
            0,
            Math.min(pointIdx, pointsData.obj.length - 1),
          );
          const point = pointsData.obj[clampedIdx];
          if (!point) return;

          worldX = point.x * scale;
          worldZ = point.z * scale;
          terrainY = getTerrainHeightAtPoint(
            point.x,
            point.z,
            headerData,
            terrainData,
            globals,
          );
        } else {
          // Fallback if spline points not available - shouldn't happen normally
          worldX = item.p0 * scale;
          worldZ = item.p1 * scale;
          terrainY = getTerrainHeightAtPoint(
            item.p0,
            item.p1,
            headerData,
            terrainData,
            globals,
          );
        }

        const posY = terrainY + SPLINE_HEIGHT_ABOVE_TERRAIN;

        // Color based on item type (different from regular items)
        const colors = [
          0x00ff00, // green
          0x00ffff, // cyan
          0xffff00, // yellow
          0xff00ff, // magenta
          0x00ff7f, // spring green
          0x1e90ff, // dodger blue
          0xffa500, // orange
          0xff1493, // deep pink
        ];
        const color = colors[item.type % colors.length];

        group.push(
          <mesh
            key={`spline-item-${splineIdx}-${itemIdx}`}
            position={[worldX, posY, worldZ]}
          >
            <boxGeometry
              args={[SPLINE_ITEM_SIZE, SPLINE_ITEM_SIZE, SPLINE_ITEM_SIZE]}
            />
            <meshStandardMaterial
              color={color}
              wireframe={false}
              emissive={color}
              emissiveIntensity={0.4}
            />
          </mesh>,
        );
      });
    });

    return group;
  };

  const itemsGroup = buildItemsGroup();

  if (!hasValidData) {
    return null;
  }

  return <group name="spline-items">{itemsGroup}</group>;
};
