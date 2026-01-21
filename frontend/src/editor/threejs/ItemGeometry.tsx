import React, { useMemo, useEffect, useRef } from "react";
import { Mesh, Group, DoubleSide } from "three";
import {
  ItemData,
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { useAtomValue } from "jotai";
import { useFrame } from "@react-three/fiber";
import { Globals } from "@/data/globals/globals";
import { Show3DItemModels } from "@/data/canvasView/canvasViewAtoms";
import { getTerrainHeightAtPoint } from "./fenceUtils/getTerrainHeightAtPoint";
import { useItemModelCache, createGameMapper } from "./hooks/useItemModelCache";
import {
  getLiquidPatchStyle,
  getLiquidPatchDimensions,
  LiquidPatchStyle,
} from "@/data/items/liquidPatchItems";
import { StandardParamType } from "@/data/items/standardParamTypes";

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
  rotation?: number;
  scale?: number;
}> = ({ position, clonedScene, rotation = 0, scale = 1 }) => {
  if (!clonedScene) {
    return null;
  }

  // Clone the pre-cloned scene for this specific instance so each item gets its own copy
  // This prevents position/rotation conflicts when using the same scene multiple times
  const instanceScene = useMemo(() => {
      const s = clonedScene.clone(true);
      if (rotation) s.rotateY(rotation);
      if (scale && scale !== 1) s.scale.multiplyScalar(scale);
      return s;
  }, [clonedScene, rotation, scale]);

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

// Calculate rotation based on standard param type
function calculateRotation(value: number, type: StandardParamType): number {
    if (type.type === "Rotation") {
        const division = Math.PI * 2 / type.divisions;
        // Check multiplier format to guess logic if not strictly divisions
        // Simplified: value * (2PI / divisions)
        return value * division;
    }
    return 0;
}

export const ItemGeometry: React.FC<ItemGeometryProps> = ({
  itemData,
  headerData,
  terrainData,
}) => {
  const globals = useAtomValue(Globals);
  const show3DItemModels = useAtomValue(Show3DItemModels);

  // Create mapper and load cache
  const mapper = useMemo(() => createGameMapper(globals.GAME_TYPE), [globals.GAME_TYPE]);
  const { loadModel, getModel } = useItemModelCache(globals.GAME_TYPE);

  // Extract level number from header if available (typically p0 or version in Hedr)
  // For most games, level number isn't explicitly in header but inferred from filename or context.
  // For now, we'll pass undefined and let mappers handle global/level logic if they can infer or default.
  // Ideally, GlobalState should hold "currentLevelNumber".
  // Assuming 1 for now if not found, logic should be robust enough.
  const levelNum = 1;

  const items = itemData.Itms?.[1000]?.obj;

  // Pre-load models for visible item types
  useEffect(() => {
    if (show3DItemModels && items) {
      items.forEach((item) => {
        const mapping = mapper.getMapping(
            item.type,
            levelNum,
            { p0: item.p0, p1: item.p1, p2: item.p2, p3: item.p3 }
        );
        if (mapping) {
          loadModel(mapping).catch((err: unknown) => {
            console.error(`Failed to load model for item type ${item.type}:`, err);
          });
        }
      });
    }
  }, [show3DItemModels, items, loadModel, mapper, levelNum]);

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

        // Check if this is a liquid patch item
        const liquidPatchStyle = getLiquidPatchStyle(globals, item.type);
        if (liquidPatchStyle) {
          const dims = getLiquidPatchDimensions(
            globals,
            item.type,
            item.p0,
            item.p1,
            item.p2,
            item.p3,
          );

          const tileSize = globals.TILE_SIZE;
          const snappedEditorX = Math.floor(item.x / tileSize) * tileSize + tileSize / 2;
          const snappedEditorZ = Math.floor(item.z / tileSize) * tileSize + tileSize / 2;
          const snappedWorldX = snappedEditorX * scale;
          const snappedWorldZ = snappedEditorZ * scale;

          const snappedTerrainY = getTerrainHeightAtPoint(
            snappedEditorX,
            snappedEditorZ,
            headerData,
            terrainData,
            globals,
          );

          const liquidY = dims.isAbsoluteY ? dims.yValue3D : snappedTerrainY + dims.yValue3D;

          return (
            <LiquidPatchPlane
              key={`liquid-patch-${idx}`}
              position={[snappedWorldX, liquidY, snappedWorldZ]}
              width={dims.width3D}
              depth={dims.depth3D}
              style={liquidPatchStyle}
            />
          );
        }

        // Render 3D model if enabled
        if (show3DItemModels) {
          const mapping = mapper.getMapping(
              item.type,
              levelNum,
              { p0: item.p0, p1: item.p1, p2: item.p2, p3: item.p3 }
          );

          if (mapping) {
              const cachedModel = getModel(mapping);
              const modelGltf = cachedModel?.gltf;
              const isLoading = cachedModel?.loading ?? false;
              const hasError = !!cachedModel?.error;

              if (isLoading) {
                return (
                  <LoadingCube
                    key={`item-loading-${idx}`}
                    position={position}
                    itemType={item.type}
                  />
                );
              }

              if (modelGltf && !hasError) {
                // Calculate dynamic rotation/scale
                let rotation = mapping.rotationY ?? 0;
                let scaleVal = mapping.scale ?? 1;

                if (mapping.rotationParam) {
                    const paramVal = item[`p${mapping.rotationParam.paramIndex}` as keyof typeof item] as number;
                    rotation += calculateRotation(paramVal, mapping.rotationParam.rotationType);
                }

                // Use the base scene from the cached GLTF
                return (
                    <ItemModel
                      key={`item-model-${idx}`}
                      position={position}
                      itemType={item.type}
                      clonedScene={modelGltf.scene}
                      rotation={rotation}
                      scale={scaleVal}
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
