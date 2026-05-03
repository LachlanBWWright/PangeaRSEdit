import {
  Float32BufferAttribute,
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
  Material,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
} from "three";
import { useEffect, useRef, memo, useCallback } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { buildWeightColorMap } from "@/modelEditing/weights/weightVisualization";
import type {
  SkinWeightsData,
  WeightBrushSettings,
  WeightVisualizationMode,
} from "@/modelEditing/weights/weightTypes";
import type { WeightBrushHit } from "@/modelEditing/weights/weightBrushStroke";
import type { ViewerInteractionMode } from "@/components/model-viewer/types";

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
  previewLighting?: boolean;
  skinData?: SkinWeightsData | null;
  weightBrushSettings?: WeightBrushSettings | null;
  weightVisualizationMode?: WeightVisualizationMode;
  interactionMode?: ViewerInteractionMode;
  onWeightBrushStroke?: (hit: WeightBrushHit) => void;
}

interface WeightVisualizationRestoreEntry {
  mesh: SkinnedMesh;
  material: Material | Material[];
  colorAttribute: ReturnType<SkinnedMesh["geometry"]["getAttribute"]> | null;
}

function createWeightVisualizationMaterial(material: Material): Material {
  if (material instanceof MeshStandardMaterial) {
    const cloned = material.clone();
    cloned.vertexColors = true;
    cloned.map = null;
    cloned.normalMap = null;
    cloned.roughnessMap = null;
    cloned.metalnessMap = null;
    cloned.emissiveMap = null;
    cloned.color.setRGB(1, 1, 1);
    return cloned;
  }

  if (material instanceof MeshPhysicalMaterial) {
    const cloned = material.clone();
    cloned.vertexColors = true;
    cloned.map = null;
    cloned.normalMap = null;
    cloned.roughnessMap = null;
    cloned.metalnessMap = null;
    cloned.emissiveMap = null;
    cloned.color.setRGB(1, 1, 1);
    return cloned;
  }

  if (material instanceof MeshBasicMaterial) {
    const cloned = material.clone();
    cloned.vertexColors = true;
    cloned.map = null;
    cloned.color.setRGB(1, 1, 1);
    return cloned;
  }

  return material;
}

function disposeMaterials(material: Material | Material[]): void {
  if (Array.isArray(material)) {
    material.forEach((entry) => entry.dispose());
    return;
  }

  material.dispose();
}

function EnhancedModelMeshComponent({
  scene,
  wireframeMode = false,
  showSkeleton = false,
  position = [0, 0, 0],
  selectedBoneName = null,
  previewLighting = false,
  skinData = null,
  weightBrushSettings = null,
  weightVisualizationMode = "none",
  interactionMode = "navigate",
  onWeightBrushStroke,
}: EnhancedModelMeshProps) {
  const skeletonHelpersRef = useRef<(SkeletonHelper | Mesh)[]>([]);
  const boneTubesRef = useRef<BoneTubeRef[]>([]);
  const activePaintPointerIdRef = useRef<number | null>(null);

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
    if (!scene || !previewLighting) return;

    const resettableMaterials: {
      material: Material;
      metalness?: number;
      roughness?: number;
    }[] = [];

    scene.traverse((object) => {
      if (!(object instanceof Mesh) || !object.material) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials) {
        if (
          material instanceof MeshStandardMaterial ||
          material instanceof MeshPhysicalMaterial
        ) {
          resettableMaterials.push({
            material,
            metalness: material.metalness,
            roughness: material.roughness,
          });
          material.metalness = 0;
          material.roughness = 1;
        }
      }
    });

    return () => {
      for (const entry of resettableMaterials) {
        if (
          entry.material instanceof MeshStandardMaterial ||
          entry.material instanceof MeshPhysicalMaterial
        ) {
          if (entry.metalness !== undefined) {
            entry.material.metalness = entry.metalness;
          }
          if (entry.roughness !== undefined) {
            entry.material.roughness = entry.roughness;
          }
        }
      }
    };
  }, [scene, previewLighting]);

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
          const boneMaterial = new MeshBasicMaterial({
            color: defaultBoneColor,
          });

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

      const dir = _dir.current.copy(end).normalize();
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

  useEffect(() => {
    if (!scene || !skinData || weightVisualizationMode === "none") {
      return undefined;
    }

    const colorMap = buildWeightColorMap(
      skinData,
      weightVisualizationMode,
      weightBrushSettings?.targetBone ?? null,
    );
    const restoreEntries: WeightVisualizationRestoreEntry[] = [];
    let vertexOffset = 0;

    scene.traverse((object) => {
      if (!(object instanceof SkinnedMesh)) {
        return;
      }

      const positionAttribute = object.geometry.getAttribute("position");
      if (!positionAttribute) {
        return;
      }

      restoreEntries.push({
        mesh: object,
        material: object.material,
        colorAttribute: object.geometry.getAttribute("color") ?? null,
      });

      const colorValues = new Float32Array(positionAttribute.count * 3);
      for (
        let vertexIndex = 0;
        vertexIndex < positionAttribute.count;
        vertexIndex += 1
      ) {
        const color = colorMap[vertexOffset + vertexIndex] ?? [128, 128, 128];
        colorValues[vertexIndex * 3] = color[0] / 255;
        colorValues[vertexIndex * 3 + 1] = color[1] / 255;
        colorValues[vertexIndex * 3 + 2] = color[2] / 255;
      }

      object.geometry.setAttribute(
        "color",
        new Float32BufferAttribute(colorValues, 3),
      );
      object.material = Array.isArray(object.material)
        ? object.material.map(createWeightVisualizationMaterial)
        : createWeightVisualizationMaterial(object.material);

      vertexOffset += positionAttribute.count;
    });

    return () => {
      restoreEntries.forEach((entry) => {
        if (entry.mesh.material !== entry.material) {
          disposeMaterials(entry.mesh.material);
        }
        entry.mesh.material = entry.material;
        if (entry.colorAttribute) {
          entry.mesh.geometry.setAttribute("color", entry.colorAttribute);
        } else {
          entry.mesh.geometry.deleteAttribute("color");
        }
      });
    };
  }, [
    scene,
    skinData,
    weightBrushSettings?.targetBone,
    weightVisualizationMode,
  ]);

  const applyBrushStroke = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (
        !onWeightBrushStroke ||
        !weightBrushSettings?.targetBone ||
        interactionMode !== "paint-weights"
      ) {
        return;
      }

      if (!(event.object instanceof SkinnedMesh)) {
        return;
      }

      const localPoint = event.object.worldToLocal(event.point.clone());
      onWeightBrushStroke({
        meshUuid: event.object.uuid,
        localPoint: [localPoint.x, localPoint.y, localPoint.z],
      });
      event.stopPropagation();
    },
    [interactionMode, onWeightBrushStroke, weightBrushSettings?.targetBone],
  );

  const handleWeightPointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      activePaintPointerIdRef.current = event.pointerId;
      applyBrushStroke(event);
    },
    [applyBrushStroke],
  );

  const handleWeightPointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (
        activePaintPointerIdRef.current !== event.pointerId ||
        (event.nativeEvent.buttons & 1) !== 1
      ) {
        return;
      }
      applyBrushStroke(event);
    },
    [applyBrushStroke],
  );

  const handleWeightPointerEnd = useCallback(() => {
    activePaintPointerIdRef.current = null;
  }, []);

  if (!scene) {
    console.warn("No scene available");
    return null;
  }

  return (
    <group position={position}>
      <primitive
        object={scene}
        onPointerDown={handleWeightPointerDown}
        onPointerMove={handleWeightPointerMove}
        onPointerUp={handleWeightPointerEnd}
        onPointerLeave={handleWeightPointerEnd}
      />
    </group>
  );
}

export const EnhancedModelMesh = memo(EnhancedModelMeshComponent);
