import type {
  SkinWeightsData,
  WeightBrushSettings,
} from "./weightTypes";

/**
 * Apply weight brush to the given set of vertex indices with a distance-based falloff.
 * Returns a new SkinWeightsData with edited vertices.
 */
export function applyWeightBrush(
  data: SkinWeightsData,
  affectedVertices: { vertexIndex: number; distance: number }[],
  settings: WeightBrushSettings,
): SkinWeightsData {
  const { radius, targetBone } = settings;
  if (!targetBone) return data;

  const targetBoneIndex = data.boneNames.indexOf(targetBone);
  if (targetBoneIndex === -1) return data;

  const editedVertices = new Map<number, VertexWeightInfo>(
    data.vertices.map((v) => [v.vertexIndex, v]),
  );

  for (const { vertexIndex, distance } of affectedVertices) {
    const vertex = editedVertices.get(vertexIndex);
    if (!vertex) continue;

    if (distance > radius) continue;

    editedVertices.set(vertexIndex, {
      ...vertex,
      influences: [{ boneIndex: targetBoneIndex, boneName: targetBone, weight: 1 }],
    });
  }

  return {
    ...data,
    vertices: data.vertices.map((v) => editedVertices.get(v.vertexIndex) ?? v),
  };
}
