import {
  Group,
  SkeletonHelper,
  Mesh,
  Object3D,
  SkinnedMesh,
  Bone,
  SphereGeometry,
  MeshBasicMaterial,
  Vector3,
  CylinderGeometry,
} from "three";
import { useEffect, useRef, memo } from "react";
import { useFrame } from "@react-three/fiber";

interface BoneTubeRef {
  tube: Mesh;
  childBone: Bone;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasColor(
  x: unknown,
): x is { color: { setHex: (hex: number) => void } } {
  if (!isRecord(x)) return false;
  const colorValue = x["color"];
  if (!isRecord(colorValue)) return false;
  return typeof colorValue["setHex"] === "function";
}

interface EnhancedModelMeshProps {
  scene: Group;
  wireframeMode?: boolean;
  showSkeleton?: boolean;
  position?: [number, number, number];
  selectedBoneName?: string | null;
}

function EnhancedModelMeshComponent({
  scene,
  wireframeMode = false,
  showSkeleton = false,
  position = [0, 0, 0],
  selectedBoneName = null,
}: EnhancedModelMeshProps) {
  const skeletonHelpersRef = useRef<(SkeletonHelper | Mesh)[]>([]);
  const boneTubesRef = useRef<BoneTubeRef[]>([]);

  useEffect(() => {
    if (!scene) return;

    // Apply wireframe mode to all meshes in the scene
    scene.traverse((object) => {
      if (object instanceof Mesh && object.material) {
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
    function hasDispose(x: unknown): x is { dispose: () => void } {
      return (
        typeof x === "object" &&
        x !== null &&
        "dispose" in x &&
        typeof (x as Record<string, unknown>)["dispose"] === "function"
      );
    }


    // Clean up previous skeleton helpers
    skeletonHelpersRef.current.forEach((helper) => {
      // Handle both SkeletonHelper and Mesh objects
      if (helper instanceof Object3D) {
        if (helper.parent) {
          helper.parent.remove(helper);
        } else {
          scene.remove(helper);
        }
      }
      // Dispose if available
      if (hasDispose(helper)) {
        helper.dispose();
      }
      // Dispose geometry and material if it's a mesh
      if (helper instanceof Mesh) {
        if (helper.geometry) helper.geometry.dispose();
        if (Array.isArray(helper.material)) {
          helper.material.forEach((mat) => mat.dispose());
        } else if (helper.material) {
          helper.material.dispose();
        }
      }
    });
    skeletonHelpersRef.current = [];
    boneTubesRef.current = [];

    if (showSkeleton) {
      const defaultBoneColor = 0x00ff00;
      // Find all skinned meshes and create skeleton helpers
      scene.traverse((object) => {
        if (object instanceof SkinnedMesh && object.skeleton) {
          const skeleton = object.skeleton;

          // Create bone joint spheres
          const boneGeometry = new SphereGeometry(0.5, 8, 8);
          const boneMaterial = new MeshBasicMaterial({ color: defaultBoneColor });

          skeleton.bones.forEach((bone) => {
            const boneMesh = new Mesh(boneGeometry, boneMaterial.clone());
            boneMesh.position.set(0, 0, 0);
            boneMesh.scale.setScalar(0.3);
            boneMesh.userData.boneName = bone.name;
            const material = Array.isArray(boneMesh.material)
              ? boneMesh.material[0]
              : boneMesh.material;
            if (material && hasColor(material)) {
              material.color.setHex(defaultBoneColor);
            }
            bone.add(boneMesh);
            skeletonHelpersRef.current.push(boneMesh);
          });

          // Create bone connection tubes between parent-child pairs.
          // Tubes use unit-height geometry and are scaled dynamically each
          // frame so they always stretch from parent joint to child joint.
          skeleton.bones.forEach((bone) => {
            skeleton.bones.forEach((otherBone) => {
              if (otherBone.parent === bone && otherBone instanceof Bone) {
                const end = new Vector3().copy(otherBone.position);
                const distance = end.length();

                if (distance > 0.001) {
                  const tubeGeometry = new CylinderGeometry(0.08, 0.08, 1, 4);
                  const tubeMaterial = new MeshBasicMaterial({
                    color: 0xffff00,
                  });
                  const tube = new Mesh(tubeGeometry, tubeMaterial);

                  bone.add(tube);
                  skeletonHelpersRef.current.push(tube);
                  boneTubesRef.current.push({
                    tube,
                    childBone: otherBone,
                  });
                }
              }
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
        if (helper instanceof SkeletonHelper) {
          helper.dispose();
        }
        // Dispose geometry and material if it's a mesh
        if (helper instanceof Mesh) {
          if (helper.geometry) helper.geometry.dispose();
          if (Array.isArray(helper.material)) {
            helper.material.forEach((mat) => mat.dispose());
          } else if (helper.material) {
            helper.material.dispose();
          }
        }
      });
      skeletonHelpersRef.current = [];
      boneTubesRef.current = [];
    };
  }, [scene, showSkeleton]);

  // Re-orient helper tubes every frame so they always connect parent → child
  const _yAxis = useRef(new Vector3(0, 1, 0));
  const _end = useRef(new Vector3());
  const _dir = useRef(new Vector3());
  const _axis = useRef(new Vector3());

  useFrame(() => {
    const yAxis = _yAxis.current;

    for (const { tube, childBone } of boneTubesRef.current) {
      const end = _end.current.copy(childBone.position);
      const distance = end.length();

      if (distance < 0.001) {
        tube.scale.set(0, 0, 0);
        continue;
      }

      tube.position.copy(end).multiplyScalar(0.5);
      tube.scale.set(1, distance, 1);

      const dir = _dir.current.copy(end).divideScalar(distance);
      const dot = dir.dot(yAxis);

      if (dot > 0.9999) {
        tube.quaternion.set(0, 0, 0, 1);
      } else if (dot < -0.9999) {
        tube.quaternion.set(0, 0, 1, 0);
      } else {
        const axis = _axis.current.crossVectors(yAxis, dir).normalize();
        const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
        tube.quaternion.setFromAxisAngle(axis, angle);
      }
    }
  });

  useEffect(() => {
    if (!showSkeleton) return;
    const defaultBoneColor = 0x00ff00;
    const selectedBoneColor = 0x3b82f6;
    skeletonHelpersRef.current.forEach((helper) => {
      if (!(helper instanceof Mesh)) return;
      const boneNameValue = helper.userData.boneName;
      if (typeof boneNameValue !== "string") return;
      const material = Array.isArray(helper.material)
        ? helper.material[0]
        : helper.material;
      if (!material) return;
      if (hasColor(material)) {
        material.color.setHex(
          boneNameValue === selectedBoneName
            ? selectedBoneColor
            : defaultBoneColor,
        );
      }
    });
  }, [selectedBoneName, showSkeleton]);

  if (!scene) {
    console.warn("No scene available");
    return null;
  }

  return (
    <group position={position}>
      <primitive object={scene} />
    </group>
  );
}

export const EnhancedModelMesh = memo(EnhancedModelMeshComponent);
