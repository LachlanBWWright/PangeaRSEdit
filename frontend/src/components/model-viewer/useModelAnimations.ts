// Hook for managing animations in the model viewer
import { useEffect, useState } from "react";
import * as THREE from "three";
import { GLTF as GLTFResult } from "three-stdlib";
import { AnimationInfo } from "@/components/AnimationViewer";

/**
 * Hook for processing and managing glTF animations
 */
export function useModelAnimations(
  gltfResult: GLTFResult | undefined,
  onAnimationsReady?: (animations: AnimationInfo[], mixer: THREE.AnimationMixer | null) => void
) {
  const [animationMixer, setAnimationMixer] = useState<THREE.AnimationMixer | null>(null);

  useEffect(() => {
    if (gltfResult?.scene) {
      // Handle animations
      if (gltfResult.animations && gltfResult.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(gltfResult.scene);
        setAnimationMixer(mixer);

        // Extract animation info
        const animationInfos: AnimationInfo[] = gltfResult.animations.map((clip: THREE.AnimationClip, index: number) => ({
          name: clip.name || `Animation ${index + 1}`,
          duration: clip.duration,
          index: index,
          clip: clip,
        }));

        if (onAnimationsReady) {
          onAnimationsReady(animationInfos, mixer);
        }

        console.log(`Found ${gltfResult.animations.length} animations:`, animationInfos);
      } else {
        setAnimationMixer(null);
        if (onAnimationsReady) {
          onAnimationsReady([], null);
        }
      }
    } else {
      setAnimationMixer(null);
      if (onAnimationsReady) onAnimationsReady([], null);
    }
  }, [gltfResult?.scene, gltfResult?.animations, onAnimationsReady]);

  return { animationMixer };
}