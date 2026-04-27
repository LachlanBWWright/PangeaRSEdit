import type { Group } from "three";
import { SkinnedMesh } from "three";
import type { SkinWeightsData } from "./weightTypes";

/**
 * Write edited skin weights back into the Three.js SkinnedMesh BufferAttributes.
 * Operates in-place (mutating the geometry attributes for GPU upload).
 */
export function applyWeightEditToScene(
  scene: Group,
  data: SkinWeightsData,
): void {
  const skinnedMeshes: SkinnedMesh[] = [];
  scene.traverse((obj) => {
    if (obj instanceof SkinnedMesh) {
      skinnedMeshes.push(obj);
    }
  });

  let globalVertexOffset = 0;

  for (const mesh of skinnedMeshes) {
    const skinIndex = mesh.geometry.attributes["skinIndex"];
    const skinWeight = mesh.geometry.attributes["skinWeight"];

    if (!skinIndex || !skinWeight) continue;

    const vertexCount = skinIndex.count;
    const localBoneNames = mesh.skeleton.bones.map((b) => b.name);
    const localBoneNameToIndex = new Map(
      localBoneNames.map((name, i) => [name, i]),
    );

    for (let i = 0; i < vertexCount; i++) {
      const globalIdx = globalVertexOffset + i;
      const vertexData = data.vertices[globalIdx];
      if (!vertexData) continue;

      // Sort influences by weight descending, take top 4
      const sorted = [...vertexData.influences]
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 4);

      // Write back (pad to 4 slots)
      for (let j = 0; j < 4; j++) {
        const inf = sorted[j];
        if (inf) {
          const localIdx = localBoneNameToIndex.get(inf.boneName) ?? 0;
          skinIndex.setComponent(i, j, localIdx);
          skinWeight.setComponent(i, j, inf.weight);
        } else {
          skinIndex.setComponent(i, j, 0);
          skinWeight.setComponent(i, j, 0);
        }
      }
    }

    skinIndex.needsUpdate = true;
    skinWeight.needsUpdate = true;

    globalVertexOffset += vertexCount;
  }
}
