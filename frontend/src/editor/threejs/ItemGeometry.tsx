import React, { useMemo, useEffect, useRef } from "react";
import { Mesh, Group, DoubleSide } from "three";
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
import {
  getItemModelMapping,
  type ItemModelMapping,
} from "@/data/items/ottoItemModelMapping";
import {
  getLiquidPatchStyle,
  getLiquidPatchDimensions,
  LiquidPatchStyle,
} from "@/data/items/liquidPatchItems";
import { ItemFilterState } from "../../data/items/itemFilterAtoms";
import { filterItems } from "../../data/items/itemFilterUtils";

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
  const meshRef = useRef<Mesh | null>(null);

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
  clonedScene: Group | null;
  mapping: ItemModelMapping | null;
}> = ({ position, clonedScene }) => {
  if (!clonedScene) {
    return null;
  }

  // Clone the pre-cloned scene for this specific instance so each item gets its own copy
  // This prevents position/rotation conflicts when using the same scene multiple times
  const instanceScene = clonedScene.clone(true);

  return <primitive object={instanceScene} position={position} />;
};

/**
 * Liquid patch plane for rendering water/lava/honey/slime patches in Bugdom 1 and Nanosaur 1.
 * Rendered as a flat transparent rectangle on the terrain to resemble water bodies.
 */
const LiquidPatchPlane: React.FC<{
  position: [number, number, number];
  width: number;
  depth: number;
  style: LiquidPatchStyle;
}> = ({ position, width, depth, style }) => {
  // Slightly raise the plane above terrain to avoid z-fighting
  const adjustedPosition: [number, number, number] = [
    position[0],
    position[1] + 5,
    position[2],
  ];

  return (
    <group position={adjustedPosition}>
      {/* Main liquid plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color={style.color3D}
          opacity={style.opacity3D}
          transparent={true}
          side={DoubleSide}
        />
      </mesh>
      {/* Inner rectangle for visual effect */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1, 0]}>
        <planeGeometry args={[width * 0.7, depth * 0.7]} />
        <meshStandardMaterial
          color={style.color3D}
          opacity={style.opacity3D * 0.5}
          transparent={true}
          side={DoubleSide}
        />
      </mesh>
      {/* Center highlight for lava/hot liquids */}
      {style.type === "lava" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2, 0]}>
          <planeGeometry args={[width * 0.3, depth * 0.3]} />
          <meshStandardMaterial
            color={0xffaa00}
            opacity={0.9}
            transparent={true}
            emissive={0xff6600}
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
    </group>
  );
};

export const ItemGeometry: React.FC<ItemGeometryProps> = ({
  itemData,
  headerData,
  terrainData,
}) => {
  const globals = useAtomValue(Globals);
  const show3DItemModels = useAtomValue(Show3DItemModels);
  const { modelCache, loadModel } = useOttoItemModelCache();

  const filterState = useAtomValue(ItemFilterState);

  // Use raw items from data, 1000 is the standard ID for items in Pangea games
  const rawItems = itemData.Itms?.[1000]?.obj;

  // Apply filtering
  const items = useMemo(() => {
    if (!rawItems) return [];
    // Map raw items to include index for stable filtering
    const itemsWithIndex = rawItems.map((item, index) => ({ ...item, index }));
    return filterItems(itemsWithIndex, filterState, globals.GAME_TYPE);
  }, [rawItems, filterState, globals.GAME_TYPE]);

  // Group items by type for easier processing
  const itemsByType = useMemo(() => {
    if (!items) return new Map();
    const groups = new Map<number, typeof items>();
    items.forEach((item) => {
      if (!groups.has(item.type)) {
        groups.set(item.type, []);
      }
      const group = groups.get(item.type);
      if (group) {
        group.push(item);
      }
    });
    return groups;
  }, [items]);

  // Pre-load models for visible item types when toggle is enabled
  // Also prepare cloned scenes for instancing
  const clonedScenesByType = useMemo(() => {
    const scenes = new Map<number, Group | null>();
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
          console.error(`Failed to load model for item type ${itemType}:`, err);
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
      {items.map((item) => {
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

        // Check if this is a liquid patch item (water/lava/honey/slime in Bugdom 1/Nanosaur 1)
        const liquidPatchStyle = getLiquidPatchStyle(globals, item.type);
        if (liquidPatchStyle) {
          // Calculate dimensions based on item parameters
          const dims = getLiquidPatchDimensions(
            globals,
            item.type,
            item.p0,
            item.p1,
            item.p2,
            item.p3,
          );

          // Bugdom 1 snaps liquid patch positions to tile centers before terrain lookup
          // This ensures adjacent patches get consistent terrain height lookups
          const tileSize = globals.TILE_SIZE;
          const snappedEditorX =
            Math.floor(item.x / tileSize) * tileSize + tileSize / 2;
          const snappedEditorZ =
            Math.floor(item.z / tileSize) * tileSize + tileSize / 2;
          const snappedWorldX = snappedEditorX * scale;
          const snappedWorldZ = snappedEditorZ * scale;

          // Get terrain height at snapped position (same as game does)
          const snappedTerrainY = getTerrainHeightAtPoint(
            snappedEditorX,
            snappedEditorZ,
            headerData,
            terrainData,
            globals,
          );

          // If isAbsoluteY, use yValue3D directly; otherwise add it to terrain height
          const liquidY = dims.isAbsoluteY
            ? dims.yValue3D
            : snappedTerrainY + dims.yValue3D;

          // Debug: log liquid patch Y calculation
          // console.log(
          //   `LiquidPatch type=${item.type} p2=${item.p2} p3=${item.p3} isAbsoluteY=${dims.isAbsoluteY} yValue3D=${dims.yValue3D} terrainY=${snappedTerrainY} finalY=${liquidY}`,
          // );

          return (
            <LiquidPatchPlane
              key={`liquid-patch-${item.index}`} // Use original index
              position={[snappedWorldX, liquidY, snappedWorldZ]}
              width={dims.width3D}
              depth={dims.depth3D}
              style={liquidPatchStyle}
            />
          );
        }

        // Render 3D model if enabled and available (Otto Matic only for now)
        if (show3DItemModels && globals.GAME_TYPE === Game.OTTO_MATIC) {
          const cachedModel = modelCache.get(item.type);
          const modelGltf = cachedModel?.gltf;
          const isLoading = cachedModel?.loading ?? false;
          const hasError = !!cachedModel?.error;

          // Show spinning cube while loading
          if (isLoading) {
            return (
              <LoadingCube
                key={`item-loading-${item.index}`}
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
                  key={`item-model-${item.index}`}
                  position={position}
                  itemType={item.type}
                  clonedScene={clonedScene}
                  mapping={mapping ?? null}
                />
              );
            }
          }
        }

        // Default: colored cube
        return (
          <ColoredCube
            key={`item-cube-${item.index}`}
            position={position}
            itemType={item.type}
          />
        );
      })}
    </group>
  );
};
