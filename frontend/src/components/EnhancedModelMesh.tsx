import * as THREE from "three";
import { useEffect, useRef, memo } from "react";

interface EnhancedModelMeshProps {
  scene: THREE.Group;
  wireframeMode?: boolean;
  showSkeleton?: boolean;
}

function EnhancedModelMeshComponent({ scene, wireframeMode = false, showSkeleton = false }: EnhancedModelMeshProps) {
  const skeletonHelpersRef = useRef<(THREE.SkeletonHelper | THREE.Mesh)[]>([]);

  useEffect(() => {
    if (!scene) return;

    // Apply wireframe mode to all meshes in the scene
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => {
            if (mat) {
              mat.wireframe = wireframeMode;
            }
          });
        } else {
          object.material.wireframe = wireframeMode;
        }
      }
    });
  }, [scene, wireframeMode]);

  useEffect(() => {
    if (!scene) return;

    // Clean up previous skeleton helpers
    skeletonHelpersRef.current.forEach((helper) => {
      // Handle both SkeletonHelper and Mesh objects
      if (helper instanceof THREE.Object3D) {
        if (helper.parent) {
          helper.parent.remove(helper);
        } else {
          scene.remove(helper);
        }
      }
      // Dispose if available
      const helperObj = helper as unknown as { dispose?: () => void };
      if (helperObj && typeof helperObj.dispose === "function") {
        helperObj.dispose();
      }
      // Dispose geometry and material if it's a mesh
      if (helper instanceof THREE.Mesh) {
        if (helper.geometry) helper.geometry.dispose();
        if (Array.isArray(helper.material)) {
          helper.material.forEach((mat) => mat.dispose());
        } else if (helper.material) {
          helper.material.dispose();
        }
      }
    });
    skeletonHelpersRef.current = [];

    if (showSkeleton) {
      // Find all skinned meshes and create skeleton helpers
      scene.traverse((object) => {
        if (object instanceof THREE.SkinnedMesh && object.skeleton) {
          const skeleton = object.skeleton;

          // Create bone joint spheres
          const boneGeometry = new THREE.SphereGeometry(0.5, 8, 8);
          const boneMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

          skeleton.bones.forEach((bone) => {
            const boneMesh = new THREE.Mesh(boneGeometry, boneMaterial.clone());
            // Position at origin since this is added as a child of the bone
            // The bone's position already defines where this sphere appears in space
            boneMesh.position.set(0, 0, 0);
            boneMesh.scale.setScalar(0.3); // Small spheres at joints
            bone.add(boneMesh);
            skeletonHelpersRef.current.push(boneMesh as unknown as THREE.SkeletonHelper);
          });

          // Create bone connection tubes (only connect parent to child bones in skeleton)
          skeleton.bones.forEach((bone) => {
            skeleton.bones.forEach((otherBone) => {
              // Check if otherBone is a direct child of bone in the skeleton
              // A bone is a child if its parent is this bone
              if (otherBone.parent === bone) {
                const end = new THREE.Vector3().copy(otherBone.position);
                const distance = end.length();

                if (distance > 0.001) {
                  // Create tube connecting parent to child bone
                  const tubeGeometry = new THREE.CylinderGeometry(0.08, 0.08, distance, 4);
                  const tubeMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
                  const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);

                  // Position tube at midpoint between origin and child (since we're in parent bone space)
                  tube.position.copy(end).multiplyScalar(0.5);

                  // Orient tube to point toward child
                  // CylinderGeometry points along Y-axis by default, so we need to rotate from Y to direction
                  const direction = end.clone().normalize();
                  const yAxis = new THREE.Vector3(0, 1, 0);

                  // If direction is already pointing up, no rotation needed
                  if (Math.abs(direction.dot(yAxis)) < 0.9999) {
                    // Calculate rotation axis as cross product of Y and direction
                    const axis = new THREE.Vector3().crossVectors(yAxis, direction).normalize();
                    // Calculate angle between Y and direction
                    const angle = Math.acos(Math.min(1, Math.max(-1, yAxis.dot(direction))));
                    tube.quaternion.setFromAxisAngle(axis, angle);
                  }

                  // Add tube as child of parent bone so it moves with skeleton animation
                  bone.add(tube);
                  skeletonHelpersRef.current.push(tube as unknown as THREE.SkeletonHelper);
                }
              }
            });
          });

          // Log bone positions
          console.log("=== Skeleton Bone Positions ===");
          skeleton.bones.forEach((bone, index) => {
            const worldPosition = new THREE.Vector3();
            bone.getWorldPosition(worldPosition);
            console.log(`Bone ${index} (${bone.name}):`, {
              local: bone.position.toArray(),
              world: worldPosition.toArray(),
              children: bone.children.length,
            });
          });
        }
      });
    }

    // Cleanup function will be called before next effect or on unmount
    return () => {
      skeletonHelpersRef.current.forEach((helper) => {
        if (helper.parent) {
          helper.parent.remove(helper);
        } else {
          scene.remove(helper);
        }
        // Dispose if it's a SkeletonHelper
        if (helper instanceof THREE.SkeletonHelper) {
          helper.dispose();
        }
        // Dispose geometry and material if it's a mesh
        if (helper instanceof THREE.Mesh) {
          if (helper.geometry) helper.geometry.dispose();
          if (Array.isArray(helper.material)) {
            helper.material.forEach((mat) => mat.dispose());
          } else if (helper.material) {
            helper.material.dispose();
          }
        }
      });
      skeletonHelpersRef.current = [];
    };
  }, [scene, showSkeleton]);

  if (!scene) {
    console.warn("No scene available");
    return null;
  }

  return (
    <primitive object={scene} />
  );
}

export const EnhancedModelMesh = memo(EnhancedModelMeshComponent);
