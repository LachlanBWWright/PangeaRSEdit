import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import type { Group } from "three";
import { CaptureObjectModelSnapshot } from "./CaptureObjectModelSnapshot";
import type { CollisionPreviewBounds } from "./scriptCollisionPreview";

export function ObjectModelPreview({ scene, snapshotKey, scale = 1, collision }: { scene: Group; snapshotKey: string; scale?: number; collision?: CollisionPreviewBounds | null }) {
  return <div className="h-64 overflow-hidden rounded-lg border border-slate-700" aria-label="Game model preview">
    <Canvas frameloop="demand" camera={{ position: [200, 150, 200], fov: 45 }}>
      <color attach="background" args={["#1c2739"]} /><ambientLight intensity={1} />
      <directionalLight position={[100, 200, 100]} intensity={2} />
      <Bounds key={`${scale}:${collision?.width}:${collision?.height}:${collision?.depth}`} fit clip observe margin={1.4} maxDuration={0}>
        <group scale={scale}><primitive object={scene} /></group>
        {collision && <mesh><boxGeometry args={[collision.width, collision.height, collision.depth]} /><meshBasicMaterial color="#22d3ee" wireframe depthTest={false} /></mesh>}
      </Bounds>
      <OrbitControls makeDefault />{!collision && <CaptureObjectModelSnapshot key={snapshotKey} snapshotKey={snapshotKey} />}
    </Canvas>
  </div>;
}
