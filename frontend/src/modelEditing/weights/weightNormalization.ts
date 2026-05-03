import type {
  SkinWeightsData,
  VertexWeightInfo,
  VertexWeight,
} from "./weightTypes";

const MAX_INFLUENCES = 4;
const MIN_WEIGHT = 1e-5;

/**
 * Normalize all vertex influences so they sum to 1.0, pruning tiny weights.
 */
export function normalizeVertexWeights(
  vertex: VertexWeightInfo,
): VertexWeightInfo {
  // Prune tiny weights
  const pruned = vertex.influences.filter((w) => w.weight > MIN_WEIGHT);
  if (pruned.length === 0) return { ...vertex, influences: [] };

  // Limit to MAX_INFLUENCES by keeping largest
  const sorted = [...pruned]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_INFLUENCES);

  // Normalize
  const total = sorted.reduce((sum, w) => sum + w.weight, 0);
  if (total <= 0) return { ...vertex, influences: [] };
  const normalized = sorted.map(
    (w): VertexWeight => ({ ...w, weight: w.weight / total }),
  );

  return { ...vertex, influences: normalized };
}

/**
 * Normalize all vertices in a SkinWeightsData.
 */
export function normalizeSkinWeights(data: SkinWeightsData): SkinWeightsData {
  return {
    ...data,
    vertices: data.vertices.map(normalizeVertexWeights),
  };
}

/**
 * Find vertices that have zero total weight (unweighted vertices).
 */
export function findUnweightedVertices(data: SkinWeightsData): number[] {
  return data.vertices
    .filter(
      (v) => v.influences.reduce((sum, w) => sum + w.weight, 0) <= MIN_WEIGHT,
    )
    .map((v) => v.vertexIndex);
}

/**
 * Find vertices where weights don't sum to ~1.0 (normalization errors).
 */
export function findNormalizationErrors(
  data: SkinWeightsData,
  tolerance = 0.01,
): number[] {
  return data.vertices
    .filter((v) => {
      const total = v.influences.reduce((sum, w) => sum + w.weight, 0);
      return total > MIN_WEIGHT && Math.abs(total - 1.0) > tolerance;
    })
    .map((v) => v.vertexIndex);
}

/**
 * Repair all normalization errors by re-normalizing.
 */
export function repairNormalizationErrors(
  data: SkinWeightsData,
): SkinWeightsData {
  return normalizeSkinWeights(data);
}
