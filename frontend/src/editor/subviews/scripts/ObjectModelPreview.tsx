import { useCallback, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import { useSetAtom } from "jotai";
import { Result } from "neverthrow";
import type { Group } from "three";
import { objectModelSnapshotsAtom } from "./objectModelSnapshots";
import type { CollisionPreviewBounds } from "./scriptCollisionPreview";

function CaptureModelSnapshot({ onCapture }: { onCapture: (snapshot: string) => void }) {
  const frames = useRef(0);
  useFrame(({ gl, scene, camera, invalidate }) => {
    gl.render(scene, camera);
    if (frames.current >= 6) return;
    frames.current += 1;
    if (frames.current < 6) { invalidate(); return; }
    const snapshot = Result.fromThrowable(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 96;
      canvas.height = 96;
      const context = canvas.getContext("2d");
      if (!context) return null;
      const source = gl.domElement;
      const size = Math.min(source.width, source.height);
      context.drawImage(source, (source.width - size) / 2, (source.height - size) / 2, size, size, 0, 0, 96, 96);
      return canvas.toDataURL("image/png");
    }, () => null)().unwrapOr(null);
    if (snapshot) onCapture(snapshot);
  }, 1);
  return null;
}

export function ObjectModelPreview({ scene, snapshotKey, scale = 1, collision }: { scene: Group; snapshotKey: string; scale?: number; collision?: CollisionPreviewBounds | null }) {
  const setSnapshots = useSetAtom(objectModelSnapshotsAtom);
  const capture = useCallback((snapshot: string) => {
    setSnapshots((current) => ({ ...Object.fromEntries(Object.entries(current).slice(-63)), [snapshotKey]: snapshot }));
  }, [setSnapshots, snapshotKey]);
  return <div className="h-64 overflow-hidden rounded-lg border border-slate-700" aria-label="Game model preview">
    <Canvas frameloop="demand" camera={{ position: [200, 150, 200], fov: 45 }}>
      <color attach="background" args={["#1c2739"]} /><ambientLight intensity={1} />
      <directionalLight position={[100, 200, 100]} intensity={2} />
      <Bounds key={`${scale}:${collision?.width}:${collision?.height}:${collision?.depth}`} fit clip observe margin={1.4} maxDuration={0}>
        <group scale={scale}><primitive object={scene} /></group>
        {collision && <mesh><boxGeometry args={[collision.width, collision.height, collision.depth]} /><meshBasicMaterial color="#22d3ee" wireframe depthTest={false} /></mesh>}
      </Bounds>
      <OrbitControls makeDefault />{!collision && <CaptureModelSnapshot key={snapshotKey} onCapture={capture} />}
    </Canvas>
  </div>;
}
