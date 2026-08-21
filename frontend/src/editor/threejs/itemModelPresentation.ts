import {
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
} from "three";
import { calculateRotation, calculateScale, isRotationParam } from "@/data/items/standardParamTypes";
import type { ItemModelParams } from "./hooks/itemModelCacheKey";
import type { UniversalItemModelMapping } from "@/data/items/itemModelTypes";
import { cloneGroupForItemRendering } from "./hooks/itemModelLoaderUtils";

export function applyItemModelLighting(
  scene: Group,
  lightingMode: UniversalItemModelMapping["lightingMode"],
): void {
  if (lightingMode !== "unlit") return;
  scene.traverse((node) => {
    if (!(node instanceof Mesh) || !node.material) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    const unlitMaterials = materials.map((material) => {
      if (material instanceof MeshBasicMaterial) {
        material.side = DoubleSide;
        material.toneMapped = false;
        material.needsUpdate = true;
        return material;
      }
      if (!(material instanceof MeshStandardMaterial) && !(material instanceof MeshPhysicalMaterial)) {
        return material;
      }
      const unlit = new MeshBasicMaterial({
        map: material.map,
        color: material.color,
        transparent: material.transparent,
        alphaTest: material.alphaTest,
        side: DoubleSide,
        opacity: material.opacity,
        vertexColors: material.vertexColors,
      });
      unlit.name = material.name;
      unlit.depthWrite = material.depthWrite;
      unlit.toneMapped = false;
      return unlit;
    });
    node.material = Array.isArray(node.material)
      ? unlitMaterials
      : (unlitMaterials[0] ?? node.material);
  });
}

export function presentItemModel(
  source: Group,
  mapping: UniversalItemModelMapping,
  params: ItemModelParams,
): Group {
  const scene = cloneGroupForItemRendering(source);
  const baseScale = mapping.scale ?? 1;
  const parameterScale = mapping.scaleParam
    ? calculateScale(params[`p${mapping.scaleParam.paramIndex}`], {
        type: "Scale",
        description: "mapping scale",
        minValue: 0,
        maxValue: Number.MAX_SAFE_INTEGER,
        defaultValue: mapping.scaleParam.offset,
        scaleFactor: mapping.scaleParam.multiplier,
      })
    : 1;
  const sx = baseScale * parameterScale * (mapping.scaleXZ ?? 1);
  const sy = baseScale * parameterScale * (mapping.scaleY ?? 1);
  scene.scale.set(sx, sy, sx);

  const parameterRotation = mapping.rotationParam && isRotationParam(mapping.rotationParam.rotationType)
    ? calculateRotation(params[`p${mapping.rotationParam.paramIndex}`], mapping.rotationParam.rotationType)
    : 0;
  scene.rotation.y = (mapping.rotationY ?? 0) + parameterRotation;
  const position = mapping.positionOffset ?? [0, 0, 0];
  scene.position.set(position[0], position[1] + (mapping.yOffset ?? 0), position[2]);
  applyItemModelLighting(scene, mapping.lightingMode);
  return scene;
}

export function applyModelPartLocalTransform(
  scene: Group,
  part: NonNullable<UniversalItemModelMapping["modelParts"]>[number],
  mapping: UniversalItemModelMapping,
): void {
  const parentScale = mapping.scale ?? 1;
  const partScale = part.scale ?? parentScale;
  const partScaleXZ = part.scaleXZ ?? mapping.scaleXZ ?? 1;
  const partScaleY = part.scaleY ?? mapping.scaleY ?? 1;
  scene.scale.set(
    (partScale / parentScale) * (partScaleXZ / (mapping.scaleXZ ?? 1)),
    (partScale / parentScale) * (partScaleY / (mapping.scaleY ?? 1)),
    (partScale / parentScale) * (partScaleXZ / (mapping.scaleXZ ?? 1)),
  );
  scene.rotation.y = (part.rotationY ?? 0) - (mapping.rotationY ?? 0);
  const position = part.positionOffset ?? [0, 0, 0];
  scene.position.set(position[0], position[1], position[2]);
}
