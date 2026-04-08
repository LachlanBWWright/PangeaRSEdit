import React, { useMemo, useEffect } from "react";
import { Group } from "three";
import { ResultAsync } from "neverthrow";
import {
  SplineData,
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";
import { Show3DItemModels } from "@/data/canvasView/canvasViewAtoms";
import { getTerrainHeightAtPoint } from "./fenceUtils/getTerrainHeightAtPoint";
import { useItemModelCache } from "./hooks/useOttoItemModelCache";
import { getGameMapper } from "@/data/items/mappers";
import { mapErr } from "@/utils/mapErr";

interface SplineItemGeometryProps {
  splineData: SplineData;
  headerData: HeaderData;
  terrainData: TerrainData;
}

const SPLINE_ITEM_SIZE = 40; // World units for spline item cube size
const SPLINE_HEIGHT_ABOVE_TERRAIN = 15; // Offset above terrain

const SPLINE_COLORS = [
  0x00ff00, // green
  0x00ffff, // cyan
  0xffff00, // yellow
  0xff00ff, // magenta
  0x00ff7f, // spring green
  0x1e90ff, // dodger blue
  0xffa500, // orange
  0xff1493, // deep pink
];

/** Fallback colored cube for spline items without a model */
const SplineColorCube: React.FC<{
  position: [number, number, number];
  itemType: number;
}> = ({ position, itemType }) => {
  const color = SPLINE_COLORS[itemType % SPLINE_COLORS.length];
  return (
    <mesh position={position}>
      <boxGeometry args={[SPLINE_ITEM_SIZE, SPLINE_ITEM_SIZE, SPLINE_ITEM_SIZE]} />
      <meshStandardMaterial color={color} wireframe={false} emissive={color} emissiveIntensity={0.4} />
    </mesh>
  );
};

/** Render a pre-cloned scene at the given position */
const SplineItemModel: React.FC<{
  position: [number, number, number];
  clonedScene: Group;
}> = ({ position, clonedScene }) => {
  const instanceScene = useMemo(() => clonedScene.clone(true), [clonedScene]);
  return <primitive object={instanceScene} position={position} dispose={null} />;
};

export const SplineItemGeometry: React.FC<SplineItemGeometryProps> = ({
  splineData,
  headerData,
  terrainData,
}) => {
  const globals = useAtomValue(Globals);
  const show3DItemModels = useAtomValue(Show3DItemModels);
  const currentGame = globals.GAME_TYPE;
  const { modelCache, loadModel } = useItemModelCache(currentGame);
  const mapper = useMemo(() => getGameMapper(currentGame), [currentGame]);

  const splines = splineData.Spln?.[1000]?.obj;
  const splineItemsBySplineIdx = splineData.SpIt;
  const splinePointsBySplineIdx = splineData.SpPt;
  const hasValidData = !!splines && !!splineItemsBySplineIdx;

  // Collect all unique spline item types present in this level
  const uniqueSplineItemTypes = useMemo(() => {
    const types = new Set<number>();
    if (!splines || !splineItemsBySplineIdx) return types;
    splines.forEach((_, splineIdx) => {
      const itemsData = splineItemsBySplineIdx[1000 + splineIdx];
      itemsData?.obj?.forEach((item) => types.add(item.type));
    });
    return types;
  }, [splines, splineItemsBySplineIdx]);

  // Pre-load models for all spline item types when toggle is enabled
  useEffect(() => {
    if (!show3DItemModels) return;
    uniqueSplineItemTypes.forEach((itemType) => {
      const triggerLoad = async () => {
        const result = await ResultAsync.fromPromise(loadModel(itemType), mapErr);
        if (result.isErr()) {
          console.error(`[SplineItemGeometry] Failed to load model for spline item type ${itemType}:`, result.error);
        }
      };
      void triggerLoad();
    });
  }, [show3DItemModels, uniqueSplineItemTypes, loadModel]);

  // Pre-clone scenes once per model, applying scale from the mapping
  const clonedScenesByType = useMemo(() => {
    const scenes = new Map<number, Group | null>();
    uniqueSplineItemTypes.forEach((itemType) => {
      const cacheKey = `g${currentGame}_${itemType}`;
      const cachedModel = modelCache.get(cacheKey);
      if (cachedModel?.gltf && !cachedModel.error) {
        const mapping = mapper?.getMapping(itemType);
        if (mapping && cachedModel.gltf.scene) {
          const cloned = cachedModel.gltf.scene.clone(true);
          const baseScale = mapping.scale ?? 1;
          const sx = baseScale * (mapping.scaleXZ ?? 1);
          const sy = baseScale * (mapping.scaleY ?? 1);
          const sz = baseScale * (mapping.scaleXZ ?? 1);
          cloned.scale.set(sx, sy, sz);
          if (mapping.rotationY) cloned.rotateY(mapping.rotationY);
          scenes.set(itemType, cloned);
        }
      }
    });
    return scenes;
  }, [modelCache, uniqueSplineItemTypes, mapper, currentGame]);

  if (!hasValidData || !splines) return null;

  const scale = globals.TILE_INGAME_SIZE / globals.TILE_SIZE;

  return (
    <group name="spline-items">
      {splines.map((_, splineIdx) => {
        const itemsData = splineItemsBySplineIdx[1000 + splineIdx];
        if (!itemsData?.obj) return null;
        const pointsData = splinePointsBySplineIdx?.[1000 + splineIdx] ?? null;

        return itemsData.obj.map((item, itemIdx) => {
          let worldX: number;
          let worldZ: number;
          let terrainY: number;

          if (pointsData?.obj && pointsData.obj.length > 0) {
            const pointIdx = Math.max(
              0,
              Math.min(
                Math.floor(item.placement * (pointsData.obj.length - 1)),
                pointsData.obj.length - 1,
              ),
            );
            const point = pointsData.obj[pointIdx];
            if (!point) return null;
            worldX = point.x * scale;
            worldZ = point.z * scale;
            terrainY = getTerrainHeightAtPoint(point.x, point.z, headerData, terrainData, globals);
          } else {
            worldX = item.p0 * scale;
            worldZ = item.p1 * scale;
            terrainY = getTerrainHeightAtPoint(item.p0, item.p1, headerData, terrainData, globals);
          }

          const position: [number, number, number] = [worldX, terrainY + SPLINE_HEIGHT_ABOVE_TERRAIN, worldZ];
          const key = `spline-item-${splineIdx}-${itemIdx}`;

          if (show3DItemModels) {
            const cacheKey = `g${currentGame}_${item.type}`;
            const cachedModel = modelCache.get(cacheKey);

            if (cachedModel?.loading) {
              // Wireframe spinning cube while model loads
              const color = SPLINE_COLORS[item.type % SPLINE_COLORS.length];
              return (
                <mesh key={key} position={position}>
                  <boxGeometry args={[SPLINE_ITEM_SIZE * 0.8, SPLINE_ITEM_SIZE * 0.8, SPLINE_ITEM_SIZE * 0.8]} />
                  <meshStandardMaterial color={color} wireframe emissive={color} emissiveIntensity={0.5} />
                </mesh>
              );
            }

            const clonedScene = clonedScenesByType.get(item.type);
            if (clonedScene) {
              return <SplineItemModel key={key} position={position} clonedScene={clonedScene} />;
            }
          }

          return <SplineColorCube key={key} position={position} itemType={item.type} />;
        });
      })}
    </group>
  );
};
