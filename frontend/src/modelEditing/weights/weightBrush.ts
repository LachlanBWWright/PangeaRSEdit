import type { SkinWeightsData, VertexWeightInfo, WeightBrushSettings } from "./weightTypes";
import { normalizeVertexWeights } from "./weightNormalization";

/**
 * Apply weight brush to the given set of vertex indices with a distance-based falloff.
 * Returns a new SkinWeightsData with edited vertices.
 */
export function applyWeightBrush(
  data: SkinWeightsData,
  affectedVertices: { vertexIndex: number; distance: number }[],
  settings: WeightBrushSettings,
): SkinWeightsData {
  const { mode, radius, strength, falloff, targetBone, autoNormalize } = settings;
  if (!targetBone) return data;

  const targetBoneIndex = data.boneNames.indexOf(targetBone);
  if (targetBoneIndex === -1) return data;

  const editedVertices = new Map<number, VertexWeightInfo>(
    data.vertices.map((v) => [v.vertexIndex, v]),
  );

  for (const { vertexIndex, distance } of affectedVertices) {
    const vertex = editedVertices.get(vertexIndex);
    if (!vertex) continue;

    const t = Math.max(0, 1 - distance / radius);
    const alpha = applyFalloff(t, falloff) * strength;
    if (alpha <= 0) continue;

    const updated = editVertex(vertex, targetBoneIndex, targetBone, mode, alpha);
    const normalized = autoNormalize ? normalizeVertexWeights(updated) : updated;
    editedVertices.set(vertexIndex, normalized);
  }

  return { ...data, vertices: data.vertices.map((v) => editedVertices.get(v.vertexIndex) ?? v) };
}

function applyFalloff(t: number, falloff: WeightBrushSettings["falloff"]): number {
  switch (falloff) {
    case "linear": return t;
    case "smooth": return t * t * (3 - 2 * t); // smoothstep
    case "sharp": return t < 0.5 ? 0 : (t - 0.5) * 2;
  }
}

function editVertex(
  vertex: VertexWeightInfo,
  boneIndex: number,
  boneName: string,
  mode: WeightBrushSettings["mode"],
  alpha: number,
): VertexWeightInfo {
  const existing = vertex.influences.find((w) => w.boneIndex === boneIndex);
  const others = vertex.influences.filter((w) => w.boneIndex !== boneIndex);
  const currentWeight = existing?.weight ?? 0;

  let newWeight: number;
  switch (mode) {
    case "paint": newWeight = alpha; break;
    case "add": newWeight = Math.min(1, currentWeight + alpha); break;
    case "subtract": newWeight = Math.max(0, currentWeight - alpha); break;
    case "smooth": {
      // Average weight of this bone across all neighbours (simplified: blend toward 0.5)
      newWeight = currentWeight + (0.5 - currentWeight) * alpha;
      break;
    }
    case "normalize": {
      newWeight = currentWeight; // normalization happens in caller
      break;
    }
  }

  if (newWeight <= 0) {
    return { ...vertex, influences: others };
  }

  const newInfluence = { boneIndex, boneName, weight: newWeight };
  return { ...vertex, influences: [...others, newInfluence] };
}
