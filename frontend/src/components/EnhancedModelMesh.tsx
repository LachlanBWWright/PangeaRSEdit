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

    // Apply wireframe mode to all meshes
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => {
            if (mat) {
              mat.wireframe = wireframeMode;
              // Ensure mesh remains visible even in wireframe mode
              mat.visible = true;
              object.visible = true;
            }
          });
        } else if (object.material) {
          object.material.wireframe = wireframeMode;
          // Ensure mesh remains visible even in wireframe mode
          object.material.visible = true;
          object.visible = true;
        }
      }
    });

    // Cleanup function
    return () => {
      // Remove skeleton helpers
      skeletonHelpersRef.current.forEach((helper) => {
        scene.remove(helper);
        helper.dispose();
      });
      skeletonHelpersRef.current = [];
    };
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
      {scene.children.map((child, index) => (
        <primitive key={index} object={child} />
      ))}
    </>
  );
}
