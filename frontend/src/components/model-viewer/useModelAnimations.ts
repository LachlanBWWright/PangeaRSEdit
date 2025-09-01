// Hook for managing animations in the model viewer
import { useEffect, useState, useCallback } from "react";
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

  // Stabilize the callback to prevent infinite re-renders
  const stableOnAnimationsReady = useCallback((animations: AnimationInfo[], mixer: THREE.AnimationMixer | null) => {
    onAnimationsReady?.(animations, mixer);
  }, [onAnimationsReady]);

  useEffect(() => {
    try {
      if (gltfResult?.scene) {
        // Handle animations
        if (gltfResult.animations && gltfResult.animations.length > 0) {
          // CRITICAL FIX: Add a slight delay to ensure skeleton joints are fully added to scene
          // This prevents PropertyBinding errors where Three.js tries to resolve animation tracks
          // before the skeleton system has finished adding all joints to the scene graph
          const timeoutId = setTimeout(() => {
            console.log('Creating AnimationMixer after skeleton setup delay...');
            
            // Verify that skeleton joints are actually in the scene before creating mixer
            let jointCount = 0;
            const expectedJoints = ['Pelvis', 'Torso', 'Head', 'RightHip', 'LeftHip'];
            
            gltfResult.scene.traverse((child) => {
              if (child.name && expectedJoints.includes(child.name)) {
                jointCount++;
              }
            });
            
            if (jointCount > 0) {
              console.log(`✅ Found ${jointCount} skeleton joints in scene, creating AnimationMixer`);
            } else {
              console.log('⚠️ No skeleton joints found in scene, creating AnimationMixer anyway');
            }
            
            const mixer = new THREE.AnimationMixer(gltfResult.scene);
            setAnimationMixer(mixer);

            // Extract animation info
            const animationInfos: AnimationInfo[] = gltfResult.animations.map((clip: THREE.AnimationClip, index: number) => ({
              name: clip.name || `Animation ${index + 1}`,
              duration: clip.duration,
              index: index,
              clip: clip,
            }));

            if (stableOnAnimationsReady) {
              stableOnAnimationsReady(animationInfos, mixer);
            }

            console.log(`Found ${gltfResult.animations.length} animations:`, animationInfos);
          }, 100); // Small delay to ensure skeleton processing completes
          
          return () => clearTimeout(timeoutId);
        } else {
          setAnimationMixer(null);
          if (stableOnAnimationsReady) {
            stableOnAnimationsReady([], null);
          }
        }
      } else {
        setAnimationMixer(null);
        if (stableOnAnimationsReady) stableOnAnimationsReady([], null);
      }
    } catch (error) {
      console.error("Error in useModelAnimations:", error);
      setAnimationMixer(null);
      if (stableOnAnimationsReady) stableOnAnimationsReady([], null);
    }
  }, [gltfResult?.scene, gltfResult?.animations]);

  return { animationMixer };
}