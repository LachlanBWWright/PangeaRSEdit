import React, { useMemo, useEffect, useRef, useCallback } from "react";
import { Mesh, Group, DoubleSide } from "three";
import { ResultAsync } from "neverthrow";
import {
  ItemData,
  HeaderData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { useAtomValue } from "jotai";
import { useFrame } from "@react-three/fiber";
import { Globals } from "@/data/globals/globals";
import { Show3DItemModels } from "@/data/canvasView/canvasViewAtoms";
import { LevelNumber } from "@/data/globals/levelNumber";
import { getTerrainHeightAtPoint } from "./fenceUtils/getTerrainHeightAtPoint";
import { useItemModelCache } from "./hooks/useOttoItemModelCache";
import { getGameMapper } from "@/data/items/mappers";
import {
  getParamByIndex,
  calculateRotation,
  isRotationParam,
} from "@/data/items/standardParamTypes";
import {
  getLiquidPatchStyle,
  getLiquidPatchDimensions,
  LiquidPatchStyle,
} from "@/data/items/liquidPatchItems";
import { mapErr } from "@/utils/mapErr";
interface ItemGeometryProps {
  itemData: ItemData;
  headerData: HeaderData;
  terrainData: TerrainData;
  onItemPointerDown?: (itemIdx: number) => void;
  draggingItemIdx?: number | null;
  topologyVersion?: number;
}
const ITEM_SIZE = 50; // World units for item cube size
const DRAG_HIGHLIGHT_COLOR = 0x00aaff;
const DRAG_HIGHLIGHT_OPACITY = 0.4;
const DRAG_HIGHLIGHT_SCALE = 0.8;
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
const ItemModel: React.FC<{
  position: [number, number, number];
  itemType: number;
  clonedScene: Group;
  extraRotationY?: number;
}> = ({ position, clonedScene, extraRotationY }) => {
  const instanceScene = useMemo(() => {
    const clone = clonedScene.clone(true);
    if (extraRotationY !== undefined && extraRotationY !== 0) {
      clone.rotateY(extraRotationY);
    }
    return clone;
  }, [clonedScene, extraRotationY]);
  return (
    <group position={position}>
      <primitive object={instanceScene} dispose={null} />
    </group>
  );
};
const LiquidPatchPlane: React.FC<{
  position: [number, number, number];
  width: number;
  depth: number;
  style: LiquidPatchStyle;
}> = ({ position, width, depth, style }) => {
  const adjustedPosition: [number, number, number] = [
    position[0],
    position[1] + 5,
    position[2],
  ];
  return (
    <group position={adjustedPosition}>
      {}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color={style.color3D}
          opacity={style.opacity3D}
          transparent={true}
          side={DoubleSide}
        />
      </mesh>
      {}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1, 0]}>
        <planeGeometry args={[width * 0.7, depth * 0.7]} />
        <meshStandardMaterial
          color={style.color3D}
          opacity={style.opacity3D * 0.5}
          transparent={true}
          side={DoubleSide}
        />
      </mesh>
      {}
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
  onItemPointerDown,
  draggingItemIdx,
}) => {
  const globals = useAtomValue(Globals);
  const show3DItemModels = useAtomValue(Show3DItemModels);
  const levelNum = useAtomValue(LevelNumber);
  const currentGame = globals.GAME_TYPE;
  
  const { modelCache, loadModel } = useItemModelCache(currentGame);
  const items = itemData.Itms?.[1000]?.obj;
  const mapper = useMemo(() => getGameMapper(currentGame), [currentGame]);
  const getItemCacheKey = useCallback((itemType: number, p0: number, p1: number, p2: number, p3: number): string => {
    const gamePrefix = `g${currentGame}_`;
    if (mapper?.isParamDependent?.(itemType)) {
      const config = mapper.getParamDependentConfig?.(itemType);
      if (config) {
        const params = { p0, p1, p2, p3 };
        const paramValue = getParamByIndex(params, config.paramIndex);
        return `${gamePrefix}${itemType}_p${config.paramIndex}_${paramValue}`;
      }
      return `${gamePrefix}${itemType}_p1_${p1}`;
    }
    if (levelNum !== undefined && mapper?.isLevelDependent?.(itemType)) {
      return `${gamePrefix}${itemType}_lv${levelNum}`;
    }
    return `${gamePrefix}${itemType}`;
  }, [currentGame, mapper, levelNum]);
  const itemsByCacheKey = useMemo(() => {
    if (!items) return new Map<string, typeof items>();
    const groups = new Map<string, typeof items>();
    items.forEach((item) => {
      const cacheKey = getItemCacheKey(item.type, item.p0, item.p1, item.p2, item.p3);
      if (!groups.has(cacheKey)) {
        groups.set(cacheKey, []);
      }
      const group = groups.get(cacheKey);
      if (group) {
        group.push(item);
      }
    });
    return groups;
  }, [items, getItemCacheKey]);
  const clonedScenesByCacheKey = useMemo(() => {
    const scenes = new Map<string, Group | null>();
    itemsByCacheKey.forEach((itemsInGroup, cacheKey) => {
      const firstItem = itemsInGroup[0];
      if (!firstItem) return;
      
      const cachedModel = modelCache.get(cacheKey);
      if (cachedModel?.gltf && !cachedModel.error) {
        const params = { p0: firstItem.p0, p1: firstItem.p1, p2: firstItem.p2, p3: firstItem.p3 };
        const mapping = mapper?.getMapping(firstItem.type, levelNum, params);
        if (mapping && cachedModel.gltf.scene) {
          const cloned = cachedModel.gltf.scene.clone(true);
          const baseScale = mapping.scale ?? 1;
          const sx = baseScale * (mapping.scaleXZ ?? 1);
          const sy = baseScale * (mapping.scaleY ?? 1);
          const sz = baseScale * (mapping.scaleXZ ?? 1);
          cloned.scale.set(sx, sy, sz);
          if (mapping.rotationY) {
            cloned.rotateY(mapping.rotationY);
          }
          const yOff = mapping.yOffset ?? 0;
          if (mapping.positionOffset) {
            cloned.position.set(
              mapping.positionOffset[0],
              mapping.positionOffset[1] + yOff,
              mapping.positionOffset[2],
            );
          } else if (yOff !== 0) {
            cloned.position.set(0, yOff, 0);
          }
          scenes.set(cacheKey, cloned);
        }
      }
    });
    return scenes;
  }, [modelCache, itemsByCacheKey, mapper, levelNum]);
  useEffect(() => {
    if (show3DItemModels) {
      itemsByCacheKey.forEach((itemsInGroup) => {
        const firstItem = itemsInGroup[0];
        if (!firstItem) return;
        
        const params = { p0: firstItem.p0, p1: firstItem.p1, p2: firstItem.p2, p3: firstItem.p3 };
        const loadItemModel = async () => {
          const loadResult = await ResultAsync.fromPromise(
            loadModel(firstItem.type, params, levelNum),
            mapErr,
          );
          if (loadResult.isErr()) {
            console.error(`Failed to load model for item type ${firstItem.type}:`, loadResult.error);
          }
        };
        void loadItemModel();
      });
    }
  }, [show3DItemModels, itemsByCacheKey, loadModel, levelNum]);
  if (!items || items.length === 0) {
    return null;
  }
  return (
    <group name="items">
      {items.map((item, idx) => {
        const scale = globals.TILE_INGAME_SIZE / globals.TILE_SIZE;
        const worldX = item.x * scale;
        const worldZ = item.z * scale;
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
        const isDragging = draggingItemIdx === idx;
        const wrapWithDrag = (content: React.ReactNode) =>
          onItemPointerDown ? (
            <group
              key={`item-drag-${idx}`}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (e.nativeEvent.button === 0) onItemPointerDown(idx);
              }}
            >
              {content}
              {isDragging && (
                <mesh position={[0, 0, 0]}>
                  <sphereGeometry args={[ITEM_SIZE * DRAG_HIGHLIGHT_SCALE, 8, 8]} />
                  <meshBasicMaterial color={DRAG_HIGHLIGHT_COLOR} transparent opacity={DRAG_HIGHLIGHT_OPACITY} wireframe />
                </mesh>
              )}
            </group>
          ) : (
            <React.Fragment key={`item-frag-${idx}`}>{content}</React.Fragment>
          );
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
          const snappedEditorX =
            Math.floor(item.x / tileSize) * tileSize + tileSize / 2;
          const snappedEditorZ =
            Math.floor(item.z / tileSize) * tileSize + tileSize / 2;
          const snappedWorldX = snappedEditorX * scale;
          const snappedWorldZ = snappedEditorZ * scale;
          const snappedTerrainY = getTerrainHeightAtPoint(
            snappedEditorX,
            snappedEditorZ,
            headerData,
            terrainData,
            globals,
          );
          const liquidY = dims.isAbsoluteY
            ? dims.yValue3D
            : snappedTerrainY + dims.yValue3D;
          return wrapWithDrag(
            <LiquidPatchPlane
              key={`liquid-patch-${idx}`}
              position={[snappedWorldX, liquidY, snappedWorldZ]}
              width={dims.width3D}
              depth={dims.depth3D}
              style={liquidPatchStyle}
            />,
          );
        }
        if (show3DItemModels) {
          const itemCacheKey = getItemCacheKey(item.type, item.p0, item.p1, item.p2, item.p3);
          const cachedModel = modelCache.get(itemCacheKey);
          const modelGltf = cachedModel?.gltf;
          const isLoading = cachedModel?.loading ?? false;
          const hasError = !!cachedModel?.error;
          if (isLoading) {
            return wrapWithDrag(
              <LoadingCube
                key={`item-loading-${idx}`}
                position={position}
                itemType={item.type}
              />,
            );
          }
          if (modelGltf && !hasError) {
            const clonedScene = clonedScenesByCacheKey.get(itemCacheKey);
            if (clonedScene) {
              const params = { p0: item.p0, p1: item.p1, p2: item.p2, p3: item.p3 };
              const mapping = mapper?.getMapping(item.type, levelNum, params);
              let extraRotationY = 0;
              if (mapping?.rotationParam) {
                const rp = mapping.rotationParam;
                if (isRotationParam(rp.rotationType)) {
                  const paramValue = getParamByIndex(params, rp.paramIndex);
                  extraRotationY = calculateRotation(paramValue, rp.rotationType);
                }
              }
              return wrapWithDrag(
                <ItemModel
                  key={`item-model-${idx}`}
                  position={position}
                  itemType={item.type}
                  clonedScene={clonedScene}
                  extraRotationY={extraRotationY !== 0 ? extraRotationY : undefined}
                />,
              );
            }
          }
        }
        return wrapWithDrag(
          <ColoredCube
            key={`item-cube-${idx}`}
            position={position}
            itemType={item.type}
          />,
        );
      })}
    </group>
  );
};
