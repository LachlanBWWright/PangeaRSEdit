export type WeightBrushMode =
  | "paint"
  | "add"
  | "subtract"
  | "smooth"
  | "normalize";
export type WeightVisualizationMode =
  | "heatmap"
  | "dominant"
  | "unweighted"
  | "none";
export type WeightFalloff = "linear" | "smooth" | "sharp";

export interface WeightBrushSettings {
  mode: WeightBrushMode;
  radius: number; // world-space units
  strength: number; // 0–1
  falloff: WeightFalloff;
  targetBone: string | null;
  autoNormalize: boolean;
}

export interface VertexWeight {
  boneIndex: number;
  boneName: string;
  weight: number;
}

export interface VertexWeightInfo {
  vertexIndex: number;
  influences: VertexWeight[];
}

export interface SkinWeightsData {
  /** Ordered list of bone names matching indices */
  boneNames: string[];
  /** Per-vertex weight info (max 4 influences each) */
  vertices: VertexWeightInfo[];
}

export interface WeightEditingState {
  visualizationMode: WeightVisualizationMode;
  brushSettings: WeightBrushSettings;
  isPainting: boolean;
  skinData: SkinWeightsData | null;
}

export function defaultWeightBrushSettings(): WeightBrushSettings {
  return {
    mode: "paint",
    radius: 0.5,
    strength: 0.5,
    falloff: "smooth",
    targetBone: null,
    autoNormalize: true,
  };
}

export function defaultWeightEditingState(): WeightEditingState {
  return {
    visualizationMode: "none",
    brushSettings: defaultWeightBrushSettings(),
    isPainting: false,
    skinData: null,
  };
}
