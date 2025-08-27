// Component for updating animation mixer each frame
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface AnimationUpdaterProps {
  animationMixer: THREE.AnimationMixer | null;
}

/**
 * Component that updates the animation mixer each frame
 */
export function AnimationUpdater({ animationMixer }: AnimationUpdaterProps) {
  const mixerRef = useRef(animationMixer);
  mixerRef.current = animationMixer;

  useFrame((_state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
  });

  return null;
}