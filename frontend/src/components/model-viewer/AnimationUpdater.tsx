// Component for updating animation mixer each frame
import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface AnimationUpdaterProps {
  animationMixer: THREE.AnimationMixer | null;
  logBonePositions?: boolean;
}

/**
 * Component that updates the animation mixer each frame
 * and optionally logs bone positions to verify animations are working
 */
export function AnimationUpdater({
  animationMixer,
  logBonePositions = false,
}: AnimationUpdaterProps) {
  const mixerRef = useRef(animationMixer);
  const frameCountRef = useRef(0);
  const logIntervalRef = useRef(30); // Log every 30 frames (about 2 times per second at 60fps)
  const [bonesTracked, setBonesTracked] = useState<THREE.Bone[]>([]);

  // Find bones to track when mixer changes
  useEffect(() => {
    mixerRef.current = animationMixer;
    if (mixerRef.current && logBonePositions) {
      const root = mixerRef.current.getRoot();
      if (!root) return;
      const bones: THREE.Bone[] = [];

      root.traverse((object) => {
        if (object instanceof THREE.SkinnedMesh && object.skeleton) {
          // Track first 3 bones for logging (to avoid console spam)
          bones.push(...object.skeleton.bones.slice(0, 3));
        }
      });

      Promise.resolve().then(() => setBonesTracked(bones));
      frameCountRef.current = 0;

      if (bones.length > 0) {
        console.log("=== Animation Bone Tracking Started ===");
        console.log(
          `Tracking ${bones.length} bones:`,
          bones.map((b) => b.name),
        );
      }
    } else {
      Promise.resolve().then(() => setBonesTracked([]));
    }
  }, [animationMixer, logBonePositions]);

  useFrame((_state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);

      // Log bone positions periodically to verify animation is working
      if (logBonePositions && bonesTracked.length > 0) {
        frameCountRef.current++;

        if (frameCountRef.current % logIntervalRef.current === 0) {
          const currentTime = mixerRef.current.time;
          console.log(
            `=== Frame ${frameCountRef.current} (t=${currentTime.toFixed(
              2,
            )}s) ===`,
          );

          bonesTracked.forEach((bone) => {
            const worldPos = new THREE.Vector3();
            bone.getWorldPosition(worldPos);

            console.log(`${bone.name}:`, {
              position: bone.position.toArray().map((v) => v.toFixed(3)),
              worldPosition: worldPos.toArray().map((v) => v.toFixed(3)),
              rotation: [
                bone.rotation.x.toFixed(3),
                bone.rotation.y.toFixed(3),
                bone.rotation.z.toFixed(3),
              ],
            });
          });
        }
      }
    }
  });

  return null;
}
