// Hook for managing animations in the model viewer
import { useEffect, useState } from "react";
import { AnimationMixer, AnimationClip } from "three";
import { GLTF as GLTFResult } from "three-stdlib";
import { AnimationInfo } from "@/components/AnimationViewer";

/**
 * Hook for processing and managing glTF animations
 */
export function useModelAnimations(
  gltfResult: GLTFResult | undefined,
  onAnimationsReady?: (
    animations: AnimationInfo[],
    mixer: AnimationMixer | null,
  ) => void,
) {
  const [animationMixer, setAnimationMixer] =
    useState<AnimationMixer | null>(null);

  useEffect(() => {
    if (gltfResult?.scene) {
      // Handle animations
      if (gltfResult.animations && gltfResult.animations.length > 0) {
        const mixer = new AnimationMixer(gltfResult.scene);
        Promise.resolve().then(() => setAnimationMixer(mixer));

        // Extract animation info
        const animationInfos: AnimationInfo[] = gltfResult.animations.map(
          (clip: AnimationClip, index: number) => ({
            name: clip.name || `Animation ${index + 1}`,
            duration: clip.duration,
            index: index,
            clip: clip,
            loop: true,
          }),
        );

        if (onAnimationsReady) {
          onAnimationsReady(animationInfos, mixer);
        }

      } else {
        Promise.resolve().then(() => setAnimationMixer(null));
        if (onAnimationsReady) {
          onAnimationsReady([], null);
        }
      }
    } else {
      Promise.resolve().then(() => setAnimationMixer(null));
      if (onAnimationsReady) onAnimationsReady([], null);
    }
  }, [gltfResult?.scene, gltfResult?.animations, onAnimationsReady]);

  return { animationMixer };
}
