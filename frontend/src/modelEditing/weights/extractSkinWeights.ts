import type { Group } from "three";
import { SkinnedMesh } from "three";
import { ok, err, type Result } from "neverthrow";
import type { SkinWeightsData, VertexWeightInfo } from "./weightTypes";

/**
 * Extract per-vertex skinning weights from all SkinnedMesh nodes in a Three.js scene.
 * Returns a unified SkinWeightsData with all bone names merged and weights remapped.
 */
export function extractSkinWeights(
  scene: Group,
): Result<SkinWeightsData, string> {
  const skinnedMeshes: SkinnedMesh[] = [];
  scene.traverse((obj) => {
    if (obj instanceof SkinnedMesh) {
      skinnedMeshes.push(obj);
    }
  });

  if (skinnedMeshes.length === 0) {
    return err("No skinned meshes found in scene");
  }

  // Build unified bone name list from all skeletons
  const boneNameSet = new Set<string>();
  for (const mesh of skinnedMeshes) {
    for (const bone of mesh.skeleton.bones) {
      boneNameSet.add(bone.name);
    }
  }
  const boneNames = Array.from(boneNameSet);
  const boneNameToIndex = new Map(boneNames.map((name, i) => [name, i]));

  const vertices: VertexWeightInfo[] = [];
  let globalVertexIndex = 0;

  for (const mesh of skinnedMeshes) {
    const skinIndex = mesh.geometry.attributes["skinIndex"];
    const skinWeight = mesh.geometry.attributes["skinWeight"];

    if (!skinIndex || !skinWeight) continue;

    const vertexCount = skinIndex.count;
    const localBoneNames = mesh.skeleton.bones.map((b) => b.name);

    for (let i = 0; i < vertexCount; i++) {
      const influences = [];
      for (let j = 0; j < 4; j++) {
        const localBoneIdx = skinIndex.getComponent(i, j);
        const weight = skinWeight.getComponent(i, j);
        if (weight <= 0) continue;
        const boneName = localBoneNames[localBoneIdx] ?? "";
        const globalBoneIdx = boneNameToIndex.get(boneName) ?? 0;
        influences.push({ boneIndex: globalBoneIdx, boneName, weight });
      }
      vertices.push({ vertexIndex: globalVertexIndex++, influences });
    }
  }

  if (vertices.length === 0) {
    return err("No vertex weight data found in skinned meshes");
  }

  return ok({ boneNames, vertices });
}
