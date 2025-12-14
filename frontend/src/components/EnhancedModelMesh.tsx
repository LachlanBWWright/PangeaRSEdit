import * as THREE from "three";
import { useEffect, useRef } from "react";

interface EnhancedModelMeshProps {
  scene: THREE.Group;
  wireframeMode?: boolean;
  showSkeleton?: boolean;
}

export function EnhancedModelMesh({ scene, wireframeMode = false, showSkeleton = false }: EnhancedModelMeshProps) {
  const skeletonHelpersRef = useRef<THREE.SkeletonHelper[]>([]);

  useEffect(() => {
    if (!scene) return;

    // Apply wireframe mode to all meshes and ensure they remain visible
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Ensure mesh is visible
        object.visible = true;

        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => {
            if (mat) {
              mat.wireframe = wireframeMode;
              // Ensure material is visible
              mat.visible = true;
            }
          });
        } else if (object.material) {
          object.material.wireframe = wireframeMode;
          // Ensure material is visible
          object.material.visible = true;
        }
      }
    });

    // No cleanup needed for wireframe effect - it doesn't modify scene graph
  }, [scene, wireframeMode]);

  useEffect(() => {
    if (!scene) return;

    // Remove existing skeleton helpers
    skeletonHelpersRef.current.forEach((helper) => {
      scene.remove(helper);
      helper.dispose();
    });
    skeletonHelpersRef.current = [];

    if (showSkeleton) {
      // Find all skinned meshes and create skeleton helpers
      scene.traverse((object) => {
        if (object instanceof THREE.SkinnedMesh && object.skeleton) {
          const skeletonHelper = new THREE.SkeletonHelper(object);
          const materials = Array.isArray(skeletonHelper.material)
            ? skeletonHelper.material
            : [skeletonHelper.material];
          materials.forEach((material) => {
            if (material instanceof THREE.LineBasicMaterial) {
              material.linewidth = 3;
            }
          });
          scene.add(skeletonHelper);
          skeletonHelpersRef.current.push(skeletonHelper);
          
          // Log bone positions
          console.log("=== Skeleton Bone Positions ===");
          object.skeleton.bones.forEach((bone, index) => {
            const worldPosition = new THREE.Vector3();
            bone.getWorldPosition(worldPosition);
            console.log(`Bone ${index} (${bone.name}):`, {
              local: bone.position.toArray(),
              world: worldPosition.toArray(),
            });
          });
        }
      });
    }

    return () => {
      skeletonHelpersRef.current.forEach((helper) => {
        scene.remove(helper);
        helper.dispose();
      });
      skeletonHelpersRef.current = [];
    };
  }, [scene, showSkeleton]);

  if (!scene) {
    console.warn("No scene available");
    return null;
  }
  
  return (
    <>
      {scene.children.map((child) => (
        <primitive key={child.uuid} object={child} />
      ))}
    </>
  );
}
