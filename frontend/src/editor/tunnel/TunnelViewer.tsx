/**
 * Tunnel Viewer Component
 *
 * 3D viewer for Bugdom 2 tunnel levels using React Three Fiber.
 * Renders tunnel geometry, water, spline path, and items.
 */

import { useRef, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Line } from "@react-three/drei";
import * as THREE from "three";
import type { TunnelData, TunnelSection } from "@/data/tunnelParser/types";
import { tunnelTextureToCanvas } from "@/data/tunnelParser/textureUtils";
import {
  createTunnelMeshGeometry,
  createWaterMeshGeometry,
  getTunnelCenterFromSpline,
  getTunnelItemPosition,
} from "@/editor/tunnel/tunnelViewerGeometry";

interface TunnelViewerProps {
  tunnelData: TunnelData;
  selectedSection?: number | null;
  showWater?: boolean;
  showSpline?: boolean;
  showItems?: boolean;
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
}: {
  section: TunnelSection;
  texture: THREE.Texture;
  index: number;
  isSelected: boolean;
  showWater: boolean;
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
  showItems,
}: {
  tunnelData: TunnelData;
  showItems: boolean;
}) {
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

        return (
          <mesh key={index} position={position} scale={item.scale * 10}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial color="#ff6600" />
          </mesh>
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
  selectedSection,
  showWater = true,
  showSpline = true,
  showItems = true,
}: TunnelViewerProps) {
  const texture = useMemo(() => {
    const canvas = tunnelTextureToCanvas(tunnelData.tunnelTexture);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, [tunnelData.tunnelTexture]);

  // Calculate center of tunnel for camera focus
  const center = useMemo(() => {
    return getTunnelCenterFromSpline(tunnelData);
  }, [tunnelData]);

  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  return (
    <div className="w-full h-full">
      <Canvas>
        <PerspectiveCamera
          ref={cameraRef}
          makeDefault
          position={[center.x + 500, center.y + 500, center.z + 500]}
          fov={60}
          near={1}
          far={100000}
        />
        <OrbitControls target={center} />
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
          />
        ))}

        {/* Render spline path */}
        <SplinePath tunnelData={tunnelData} showSpline={showSpline} />

        {/* Render item markers */}
        <ItemMarkers tunnelData={tunnelData} showItems={showItems} />
      </Canvas>
    </div>
  );
}
