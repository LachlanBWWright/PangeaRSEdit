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
  const tunnelGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const mesh = section.tunnelMesh;

    // Positions
    const positions = new Float32Array(mesh.numPoints * 3);
    for (let i = 0; i < mesh.numPoints; i++) {
      const point = mesh.points[i];
      if (point) {
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;
      }
    }
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // Normals
    if (mesh.normals) {
      const normals = new Float32Array(mesh.numPoints * 3);
      for (let i = 0; i < mesh.numPoints; i++) {
        const normal = mesh.normals[i];
        if (normal) {
          normals[i * 3] = normal.x;
          normals[i * 3 + 1] = normal.y;
          normals[i * 3 + 2] = normal.z;
        }
      }
      geom.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    }

    // UVs
    const uvs = new Float32Array(mesh.numPoints * 2);
    for (let i = 0; i < mesh.numPoints; i++) {
      const uv = mesh.uvs[i];
      if (uv) {
        uvs[i * 2] = uv.u;
        uvs[i * 2 + 1] = uv.v;
      }
    }
    geom.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

    // Indices
    const indices = new Uint32Array(mesh.numTriangles * 3);
    for (let i = 0; i < mesh.numTriangles; i++) {
      const tri = mesh.triangles[i];
      if (tri) {
        indices[i * 3] = tri.a;
        indices[i * 3 + 1] = tri.b;
        indices[i * 3 + 2] = tri.c;
      }
    }
    geom.setIndex(new THREE.BufferAttribute(indices, 1));

    geom.computeBoundingSphere();
    return geom;
  }, [section.tunnelMesh]);

  const waterGeometry = useMemo(() => {
    if (!showWater) return null;

    const geom = new THREE.BufferGeometry();
    const mesh = section.waterMesh;

    if (mesh.numPoints === 0) return null;

    // Positions
    const positions = new Float32Array(mesh.numPoints * 3);
    for (let i = 0; i < mesh.numPoints; i++) {
      const point = mesh.points[i];
      if (point) {
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = point.z;
      }
    }
    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    // UVs
    const uvs = new Float32Array(mesh.numPoints * 2);
    for (let i = 0; i < mesh.numPoints; i++) {
      const uv = mesh.uvs[i];
      if (uv) {
        uvs[i * 2] = uv.u;
        uvs[i * 2 + 1] = uv.v;
      }
    }
    geom.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

    // Indices
    const indices = new Uint32Array(mesh.numTriangles * 3);
    for (let i = 0; i < mesh.numTriangles; i++) {
      const tri = mesh.triangles[i];
      if (tri) {
        indices[i * 3] = tri.a;
        indices[i * 3 + 1] = tri.b;
        indices[i * 3 + 2] = tri.c;
      }
    }
    geom.setIndex(new THREE.BufferAttribute(indices, 1));

    geom.computeVertexNormals();
    geom.computeBoundingSphere();
    return geom;
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
      (sp) => [sp.point.x, sp.point.y, sp.point.z] as [number, number, number]
    );
  }, [tunnelData.splinePoints, showSpline]);

  if (!points) return null;

  return (
    <Line
      points={points}
      color="#00ff00"
      lineWidth={2}
    />
  );
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
        const splinePoint = tunnelData.splinePoints[item.splineIndex];
        if (!splinePoint) return null;

        const position = new THREE.Vector3(
          splinePoint.point.x + item.positionOffset.x,
          splinePoint.point.y + item.positionOffset.y,
          splinePoint.point.z + item.positionOffset.z
        );

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
    if (tunnelData.splinePoints.length === 0) {
      return new THREE.Vector3(0, 0, 0);
    }
    const mid = Math.floor(tunnelData.splinePoints.length / 2);
    const midPoint = tunnelData.splinePoints[mid];
    if (!midPoint) return new THREE.Vector3(0, 0, 0);
    return new THREE.Vector3(midPoint.point.x, midPoint.point.y, midPoint.point.z);
  }, [tunnelData.splinePoints]);

  const cameraRef = useRef<THREE.PerspectiveCamera>(null);

  return (
    <div className="w-full h-full">
      <Canvas>
        <PerspectiveCamera
          ref={cameraRef}
          makeDefault
          position={[center.x + 500, center.y + 500, center.z + 500]}
          fov={60}
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
