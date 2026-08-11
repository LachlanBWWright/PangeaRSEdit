import { describe, expect, it } from "vitest";
import {
  findNormalizationErrors,
  findUnweightedVertices,
  normalizeSkinWeights,
  normalizeVertexWeights,
  repairNormalizationErrors,
} from "@/modelEditing/weights/weightNormalization";
import { buildWeightColorMap } from "@/modelEditing/weights/weightVisualization";
import type { SkinWeightsData, VertexWeightInfo } from "@/modelEditing/weights/weightTypes";

function vertex(vertexIndex: number, weights: number[]): VertexWeightInfo {
  return {
    vertexIndex,
    influences: weights.map((weight, boneIndex) => ({ boneIndex, boneName: `bone-${boneIndex}`, weight })),
  };
}

describe("weight normalization", () => {
  it("prunes tiny weights, keeps the strongest four, sorts, and normalizes", () => {
    const normalized = normalizeVertexWeights(vertex(3, [0.000001, 1, 4, 3, 2, 5]));
    expect(normalized.influences.map((influence) => influence.boneIndex)).toEqual([5, 2, 3, 4]);
    expect(normalized.influences.reduce((sum, influence) => sum + influence.weight, 0)).toBeCloseTo(1);
    expect(normalized.vertexIndex).toBe(3);
  });

  it("handles empty vertices and normalizes entire datasets immutably", () => {
    expect(normalizeVertexWeights(vertex(0, [0, 0.000001])).influences).toEqual([]);
    const data: SkinWeightsData = { boneNames: ["bone-0", "bone-1"], vertices: [vertex(0, [2, 2])] };
    const normalized = normalizeSkinWeights(data);
    expect(normalized.vertices[0]?.influences.map((value) => value.weight)).toEqual([0.5, 0.5]);
    expect(data.vertices[0]?.influences.map((value) => value.weight)).toEqual([2, 2]);
    expect(repairNormalizationErrors(data)).toEqual(normalized);
  });

  it("identifies unweighted and incorrectly normalized vertices", () => {
    const data: SkinWeightsData = { boneNames: [], vertices: [vertex(4, []), vertex(5, [0.2, 0.2]), vertex(6, [0.5, 0.5])] };
    expect(findUnweightedVertices(data)).toEqual([4]);
    expect(findNormalizationErrors(data)).toEqual([5]);
    expect(findNormalizationErrors(data, 0.7)).toEqual([]);
  });
});

describe("weight visualization", () => {
  const data: SkinWeightsData = {
    boneNames: ["bone-0", "bone-1"],
    vertices: [vertex(0, []), vertex(1, [0.25, 0.75]), vertex(2, [1.5])],
  };

  it("builds clamped heatmaps for a target bone and strongest influence", () => {
    expect(buildWeightColorMap(data, "heatmap", "bone-0")).toEqual([
      [0, 0, 255], [0, 128, 128], [255, 0, 0],
    ]);
    expect(buildWeightColorMap(data, "heatmap", null)[1]).toEqual([128, 128, 0]);
  });

  it("builds dominant, unweighted, and neutral colors", () => {
    expect(buildWeightColorMap(data, "dominant", null)).toEqual([
      [80, 80, 80], [100, 255, 100], [255, 100, 100],
    ]);
    expect(buildWeightColorMap(data, "unweighted", null)).toEqual([
      [255, 50, 50], [50, 200, 50], [50, 200, 50],
    ]);
    expect(buildWeightColorMap(data, "none", null)).toEqual([
      [128, 128, 128], [128, 128, 128], [128, 128, 128],
    ]);
  });
});
