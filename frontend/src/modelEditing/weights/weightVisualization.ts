import type { SkinWeightsData, WeightVisualizationMode } from "./weightTypes";

/**
 * Build a per-vertex color map for weight visualization.
 * Returns an array of [r, g, b] values in 0–255 range (one per vertex).
 */
export function buildWeightColorMap(
  data: SkinWeightsData,
  mode: WeightVisualizationMode,
  targetBone: string | null,
): [number, number, number][] {
  return data.vertices.map((vertex) => {
    switch (mode) {
      case "heatmap": {
        // Show weight for target bone as blue→green→red heatmap
        const boneWeight = targetBone
          ? (vertex.influences.find((w) => w.boneName === targetBone)?.weight ??
            0)
          : vertex.influences.reduce((max, w) => Math.max(max, w.weight), 0);
        return heatmapColor(boneWeight);
      }
      case "dominant": {
        // Unique color per dominant bone
        if (vertex.influences.length === 0) return [80, 80, 80];
        const dominant = vertex.influences.reduce((best, w) =>
          w.weight > best.weight ? w : best,
        );
        return boneIndexColor(dominant.boneIndex);
      }
      case "unweighted": {
        const total = vertex.influences.reduce((sum, w) => sum + w.weight, 0);
        return total < 1e-5 ? [255, 50, 50] : [50, 200, 50];
      }
      default:
        return [128, 128, 128];
    }
  });
}

function heatmapColor(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.5) {
    return [
      0,
      Math.round(clamped * 2 * 255),
      Math.round((1 - clamped * 2) * 255),
    ];
  }
  return [
    Math.round((clamped - 0.5) * 2 * 255),
    Math.round((1 - (clamped - 0.5) * 2) * 255),
    0,
  ];
}

// Visually distinct colors for up to 32 bones
const BONE_COLORS: [number, number, number][] = [
  [255, 100, 100],
  [100, 255, 100],
  [100, 100, 255],
  [255, 255, 100],
  [255, 100, 255],
  [100, 255, 255],
  [255, 180, 50],
  [180, 50, 255],
  [50, 255, 180],
  [255, 50, 180],
  [180, 255, 50],
  [50, 180, 255],
  [200, 200, 80],
  [80, 200, 200],
  [200, 80, 200],
  [150, 220, 100],
  [220, 150, 100],
  [100, 150, 220],
  [220, 100, 150],
  [100, 220, 150],
  [255, 160, 122],
  [135, 206, 235],
  [144, 238, 144],
  [255, 215, 0],
  [210, 180, 140],
  [176, 196, 222],
  [240, 128, 128],
  [152, 251, 152],
  [173, 216, 230],
  [255, 182, 193],
  [250, 128, 114],
  [189, 183, 107],
];

function boneIndexColor(index: number): [number, number, number] {
  return BONE_COLORS[index % BONE_COLORS.length] ?? [128, 128, 128];
}
