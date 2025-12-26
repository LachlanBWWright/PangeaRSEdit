import React, { useMemo, useEffect } from "react";
import {
  ItemData,
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { useAtomValue } from "jotai";
import { useFrame } from "@react-three/fiber";
import { Globals, Game } from "@/data/globals/globals";
import { Show3DItemModels } from "@/data/canvasView/canvasViewAtoms";
import { getTerrainHeightAtPoint } from "./fenceUtils/getTerrainHeightAtPoint";
import { useOttoItemModelCache } from "./hooks/useOttoItemModelCache";
import { getItemModelMapping } from "@/data/items/ottoItemModelMapping";

interface ItemGeometryProps {
  itemData: ItemData;
  headerData: HeaderData;
  terrainData: TerrainData;
}

const ITEM_SIZE = 50; // World units for item cube size

/**
 * Colored cube fallback for items without 3D models
 */
const ColoredCube: React.FC<{
  position: [number, number, number];
  itemType: number;
}> = ({ position, itemType }) => {
  const colors = [
    0xff6b6b, // red
    0x4ecdc4, // teal
    0xffe66d, // yellow
    0x95e1d3, // mint
    0xf38181, // pink
    0xaa96da, // purple
    0xfcbad3, // light pink
    0xa8dadc, // light blue
  ];
  const color = colors[itemType % colors.length];

  return (
    <mesh position={position}>
      <boxGeometry args={[ITEM_SIZE, ITEM_SIZE, ITEM_SIZE]} />
      <meshStandardMaterial
        color={color}
        wireframe={false}
        emissive={color}
        emissiveIntensity={0.3}
      />
    </mesh>
  );
};

/**
 * Loading cube with spinning animation - shown while model is loading
 */
const LoadingCube: React.FC<{
  position: [number, number, number];
  itemType: number;
}> = ({ position, itemType }) => {
  const meshRef = React.useRef<any>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.02;
      meshRef.current.rotation.y += 0.03;
    }
  });

  const colors = [
    0xff6b6b, // red
    0x4ecdc4, // teal
    0xffe66d, // yellow
    0x95e1d3, // mint
    0xf38181, // pink
    0xaa96da, // purple
    0xfcbad3, // light pink
    0xa8dadc, // light blue
  ];
  const color = colors[itemType % colors.length];

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[ITEM_SIZE * 0.8, ITEM_SIZE * 0.8, ITEM_SIZE * 0.8]} />
      <meshStandardMaterial
        color={color}
        wireframe={true}
        emissive={color}
        emissiveIntensity={0.5}
      />
    </mesh>
  );
};

/**
 * Individual item model renderer - clones the pre-cloned scene for each instance
 */
const ItemModel: React.FC<{
  position: [number, number, number];
  itemType: number;
  clonedScene: any;
  mapping: any;
}> = ({ position, clonedScene }) => {
  if (!clonedScene) {
    return null;
  }

  // Clone the pre-cloned scene for this specific instance so each item gets its own copy
  // This prevents position/rotation conflicts when using the same scene multiple times
  const instanceScene = clonedScene.clone(true);

  return <primitive object={instanceScene} position={position} />;
};

export const ItemGeometry: React.FC<ItemGeometryProps> = ({
  itemData,
  headerData,
  terrainData,
}) => {
  const globals = useAtomValue(Globals);
  const show3DItemModels = useAtomValue(Show3DItemModels);
  const { modelCache, loadModel } = useOttoItemModelCache();

  const items = itemData.Itms?.[1000]?.obj;

  // Group items by type for easier processing
  const itemsByType = useMemo(() => {
    if (!items) return new Map();
    const groups = new Map<number, typeof items>();
    items.forEach((item) => {
      if (!groups.has(item.type)) {
        groups.set(item.type, []);
      }
      groups.get(item.type)!.push(item);
    });
    return groups;
  }, [items]);

  // Pre-load models for visible item types when toggle is enabled
  // Also prepare cloned scenes for instancing
  const clonedScenesByType = useMemo(() => {
    const scenes = new Map<number, any>();
    itemsByType.forEach((_, itemType) => {
      const cachedModel = modelCache.get(itemType);
      if (cachedModel?.gltf && !cachedModel.error) {
        const mapping = getItemModelMapping(itemType);
        if (mapping && cachedModel.gltf.scene) {
          // The cached gltf.scene should already be the extracted subgroup
          // Just clone it once per item type for instancing
          const cloned = cachedModel.gltf.scene.clone(true); // true = recursive deep clone

          // Apply scale if specified
          if (mapping.scale && mapping.scale !== 1) {
            cloned.scale.set(mapping.scale, mapping.scale, mapping.scale);
          }

          // Apply rotation if specified
          if (mapping.rotationY) {
            cloned.rotateY(mapping.rotationY);
          }

          scenes.set(itemType, cloned);
        }
      }
    });
    return scenes;
  }, [modelCache, itemsByType]);

  useEffect(() => {
    if (show3DItemModels && globals.GAME_TYPE === Game.OTTO_MATIC) {
      // Load models for all unique item types in the level
      itemsByType.forEach((_, itemType) => {
        loadModel(itemType).catch((err) => {
          console.error(
            `Failed to load model for item type ${itemType}:`,
            err,
          );
        });
      });
    }
  }, [show3DItemModels, itemsByType, loadModel, globals.GAME_TYPE]);

  // Early return after all hooks
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <group name="items">
      {items.map((item, idx) => {
        // Convert editor coordinates to world coordinates
        const scale = globals.TILE_INGAME_SIZE / globals.TILE_SIZE;
        const worldX = item.x * scale;
        const worldZ = item.z * scale;

        // Get terrain height at item position
        const terrainY = getTerrainHeightAtPoint(
          item.x,
          item.z,
          headerData,
          terrainData,
          globals,
        );

        const position: [number, number, number] = [
          worldX,
          terrainY + ITEM_SIZE / 2,
          worldZ,
        ];

        // Render 3D model if enabled and available (Otto Matic only for now)
        if (
          show3DItemModels &&
          globals.GAME_TYPE === Game.OTTO_MATIC
        ) {
          const cachedModel = modelCache.get(item.type);
          const modelGltf = cachedModel?.gltf;
          const isLoading = cachedModel?.loading ?? false;
          const hasError = !!cachedModel?.error;

          // Show spinning cube while loading
          if (isLoading) {
            return (
              <LoadingCube
                key={`item-loading-${idx}`}
                position={position}
                itemType={item.type}
              />
            );
          }

          // Show loaded model if available and not errored
          if (modelGltf && !hasError) {
            const clonedScene = clonedScenesByType.get(item.type);
            if (clonedScene) {
              const mapping = getItemModelMapping(item.type);
              return (
                <ItemModel
                  key={`item-model-${idx}`}
                  position={position}
                  itemType={item.type}
                  clonedScene={clonedScene}
                  mapping={mapping}
                />
              );
            }
          }
        }

        // Default: colored cube
        return (
          <ColoredCube
            key={`item-cube-${idx}`}
            position={position}
            itemType={item.type}
          />
        );
      })}
    </group>
  );
};
