/**
 * Tunnel Viewer Component
 *
 * 3D viewer for Bugdom 2 tunnel levels using React Three Fiber.
 * Renders tunnel geometry, water, spline path, and items.
 */

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Line } from "@react-three/drei";
import * as THREE from "three";
import type {
  TunnelData,
  TunnelItem,
  TunnelSection,
} from "@/data/tunnelParser/types";
import { tunnelTextureToCanvas } from "@/data/tunnelParser/textureUtils";
import { cloneGroupForItemRendering } from "@/editor/threejs/hooks/itemModelLoaderUtils";
import { useTunnelItemModels } from "@/editor/tunnel/useTunnelItemModels";
import {
  createTunnelMeshGeometry,
  createWaterMeshGeometry,
  getTunnelCenterFromSpline,
  getTunnelItemPosition,
} from "@/editor/tunnel/tunnelViewerGeometry";

interface TunnelViewerProps {
  tunnelData: TunnelData;
  isPlumbing: boolean;
  selectedSection?: number | null;
  selectedItemIndex?: number | null;
  showWater?: boolean;
  showSpline?: boolean;
  showItems?: boolean;
  tunnelOpacity?: number;
  autoSnapToSelectedItem?: boolean;
  snapToItemToken?: number;
  dragSensitivity?: number;
  onSelectItem?: (index: number | null) => void;
  onUpdateItemSplineIndex?: (itemIndex: number, splineIndex: number) => void;
}

/**
 * Render a single tunnel section mesh
 */
function TunnelSectionMesh({
  section,
  texture,
  index,
  isSelected,
  showWater,
  tunnelOpacity,
}: {
  section: TunnelSection;
  texture: THREE.Texture;
  index: number;
  isSelected: boolean;
  showWater: boolean;
  tunnelOpacity: number;
}) {
  const tunnelGeometry = useMemo(
    () => createTunnelMeshGeometry(section.tunnelMesh),
    [section.tunnelMesh],
  );

  const waterGeometry = useMemo(() => {
    return createWaterMeshGeometry(section.waterMesh, showWater);
  }, [section.waterMesh, showWater]);

  return (
    <group key={index}>
      <mesh geometry={tunnelGeometry}>
        <meshStandardMaterial
          map={texture}
          side={THREE.DoubleSide}
          color={isSelected ? "#ffff00" : "#ffffff"}
          transparent={tunnelOpacity < 0.999}
          opacity={tunnelOpacity}
        />
      </mesh>
      {waterGeometry && (
        <mesh geometry={waterGeometry}>
          <meshStandardMaterial
            color="#4488ff"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

function clampSplineIndex(index: number, totalSplinePoints: number): number {
  if (totalSplinePoints <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(totalSplinePoints - 1, index));
}

function getFallbackColor(itemType: number, isSelected: boolean): string {
  if (isSelected) {
    return "#facc15";
  }
  const palette = ["#60a5fa", "#22d3ee", "#4ade80", "#f59e0b", "#f87171"];
  const color = palette[itemType % palette.length];
  return color ?? "#cbd5e1";
}

function TunnelItemModelInstance({ source }: { source: THREE.Group }) {
  const instance = useMemo(() => cloneGroupForItemRendering(source), [source]);
  return <primitive object={instance} dispose={null} />;
}

/**
 * Render spline path visualization
 */
function SplinePath({
  tunnelData,
  showSpline,
}: {
  tunnelData: TunnelData;
  showSpline: boolean;
}) {
  const points = useMemo(() => {
    if (!showSpline || tunnelData.splinePoints.length === 0) return null;

    return tunnelData.splinePoints.map(
      (sp) => [sp.point.x, sp.point.y, sp.point.z] as [number, number, number],
    );
  }, [tunnelData.splinePoints, showSpline]);

  if (!points) return null;

  return <Line points={points} color="#00ff00" lineWidth={2} />;
}

/**
 * Render item markers
 */
function ItemMarkers({
  tunnelData,
  isPlumbing,
  showItems,
  selectedItemIndex,
  getSceneForType,
  isLoadingType,
  dragSensitivity,
  onSelectItem,
  onUpdateItemSplineIndex,
}: {
  tunnelData: TunnelData;
  isPlumbing: boolean;
  showItems: boolean;
  selectedItemIndex: number | null;
  getSceneForType: (itemType: number) => THREE.Group | null;
  isLoadingType: (itemType: number) => boolean;
  dragSensitivity: number;
  onSelectItem?: (index: number | null) => void;
  onUpdateItemSplineIndex?: (itemIndex: number, splineIndex: number) => void;
}) {
  const [dragState, setDragState] = useState<{
    itemIndex: number;
    startX: number;
    startSplineIndex: number;
    pointerId: number;
  } | null>(null);

  if (!showItems) return null;

  return (
    <group>
      {tunnelData.items.map((item, index) => {
        const position = getTunnelItemPosition(
          tunnelData,
          item.splineIndex,
          item.positionOffset,
        );
        if (!position) return null;
        const isSelected = selectedItemIndex === index;
        const modelScene = getSceneForType(item.type);
        const isLoading = isLoadingType(item.type);

        return (
          <group
            key={index}
            position={position}
            scale={item.scale * 10}
            onPointerDown={(event: ThreeEvent<PointerEvent>) => {
              event.stopPropagation();
              event.target.setPointerCapture(event.pointerId);
              setDragState({
                itemIndex: index,
                startX: event.clientX,
                startSplineIndex: item.splineIndex,
                pointerId: event.pointerId,
              });
              onSelectItem?.(index);
            }}
            onPointerMove={(event: ThreeEvent<PointerEvent>) => {
              if (!dragState || dragState.itemIndex !== index) {
                return;
              }
              if (dragState.pointerId !== event.pointerId) {
                return;
              }

              event.stopPropagation();
              const deltaX = event.clientX - dragState.startX;
              const nextSplineIndex = clampSplineIndex(
                Math.round(
                  dragState.startSplineIndex + deltaX * dragSensitivity,
                ),
                tunnelData.splinePoints.length,
              );
              onUpdateItemSplineIndex?.(index, nextSplineIndex);
            }}
            onPointerUp={(event: ThreeEvent<PointerEvent>) => {
              if (dragState && dragState.pointerId === event.pointerId) {
                setDragState(null);
              }
              event.stopPropagation();
              event.target.releasePointerCapture(event.pointerId);
            }}
            onClick={(event: ThreeEvent<MouseEvent>) => {
              event.stopPropagation();
              onSelectItem?.(index);
            }}
          >
            {modelScene ? (
              <TunnelItemModelInstance source={modelScene} />
            ) : (
              <mesh>
                {isLoading ? (
                  <boxGeometry args={[1.2, 1.2, 1.2]} />
                ) : (
                  <icosahedronGeometry args={[1.0, 1]} />
                )}
                <meshStandardMaterial
                  color={getFallbackColor(item.type, isSelected)}
                  wireframe={isLoading}
                  emissive={getFallbackColor(item.type, isSelected)}
                  emissiveIntensity={isLoading ? 0.25 : 0.08}
                />
              </mesh>
            )}

            {isSelected && (
              <group>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[2.0, 0.16, 10, 28]} />
                  <meshStandardMaterial
                    color="#fde047"
                    emissive="#fde047"
                    emissiveIntensity={0.5}
                    transparent
                    opacity={0.9}
                  />
                </mesh>
                <pointLight color="#fde047" intensity={0.55} distance={80} />
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

/**
 * Main tunnel viewer component
 */
export function TunnelViewer({
  tunnelData,
  isPlumbing,
  selectedSection,
  selectedItemIndex = null,
  showWater = true,
  showSpline = true,
  showItems = true,
  tunnelOpacity = 1,
  autoSnapToSelectedItem = true,
  snapToItemToken = 0,
  dragSensitivity = 2,
  onSelectItem,
  onUpdateItemSplineIndex,
}: TunnelViewerProps) {
  const { getSceneForType, isLoadingType } = useTunnelItemModels(
    tunnelData,
    isPlumbing,
  );

  const texture = useMemo(() => {
    const canvas = tunnelTextureToCanvas(tunnelData.tunnelTexture);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    return tex;
  }, [
    tunnelData.tunnelTexture.width,
    tunnelData.tunnelTexture.height,
    tunnelData.tunnelTexture.data,
  ]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  // Calculate center of tunnel for camera focus
  const center = useMemo(() => {
    return getTunnelCenterFromSpline(tunnelData);
  }, [tunnelData]);

  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const controlsRef = useRef<{
    target: THREE.Vector3;
    update: () => void;
  } | null>(null);
  const lastSnapTokenRef = useRef<number>(0);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || selectedItemIndex !== null) {
      return;
    }
    controls.target.copy(center);
    controls.update();
  }, [center, selectedItemIndex]);

  useEffect(() => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) {
      return;
    }

    if (selectedItemIndex === null) {
      return;
    }

    const tokenChanged = snapToItemToken !== lastSnapTokenRef.current;
    if (!autoSnapToSelectedItem && !tokenChanged) {
      return;
    }

    lastSnapTokenRef.current = snapToItemToken;

    const selectedItem = tunnelData.items[selectedItemIndex];
    if (!selectedItem) {
      return;
    }

    const target = getTunnelItemPosition(
      tunnelData,
      selectedItem.splineIndex,
      selectedItem.positionOffset,
    );
    if (!target) {
      return;
    }

    const cameraDirection = camera.position.clone().sub(target);
    if (cameraDirection.lengthSq() < 1e-3) {
      cameraDirection.set(1, 0.5, 1);
    }

    const snappedPosition = target
      .clone()
      .add(cameraDirection.normalize().multiplyScalar(220));

    camera.position.copy(snappedPosition);
    controls.target.copy(target);
    controls.update();
  }, [autoSnapToSelectedItem, selectedItemIndex, snapToItemToken, tunnelData]);

  return (
    <div className="w-full h-full">
      <Canvas
        onPointerMissed={() => {
          onSelectItem?.(null);
        }}
      >
        <PerspectiveCamera
          ref={cameraRef}
          makeDefault
          position={[center.x + 500, center.y + 500, center.z + 500]}
          fov={60}
          near={1}
          far={100000}
        />
        <OrbitControls ref={controlsRef} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[100, 100, 100]} intensity={1} />
        <directionalLight position={[-100, -100, -100]} intensity={0.3} />

        {/* Render all sections */}
        {tunnelData.sections.map((section, index) => (
          <TunnelSectionMesh
            key={index}
            section={section}
            texture={texture}
            index={index}
            isSelected={selectedSection === index}
            showWater={showWater}
            tunnelOpacity={tunnelOpacity}
          />
        ))}

        {/* Render spline path */}
        <SplinePath tunnelData={tunnelData} showSpline={showSpline} />

        {/* Render item markers */}
        <ItemMarkers
          tunnelData={tunnelData}
          isPlumbing={isPlumbing}
          showItems={showItems}
          selectedItemIndex={selectedItemIndex}
          getSceneForType={getSceneForType}
          isLoadingType={isLoadingType}
          dragSensitivity={dragSensitivity}
          onSelectItem={onSelectItem}
          onUpdateItemSplineIndex={onUpdateItemSplineIndex}
        />
      </Canvas>
    </div>
  );
}
