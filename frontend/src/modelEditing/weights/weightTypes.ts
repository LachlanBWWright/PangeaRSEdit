/** Brush operations available in the weight editor. */
export type WeightBrushMode =
  | "paint"
  | "add"
  | "subtract"
  | "smooth"
  | "normalize";
/** Visualization modes available for skin-weight overlays. */
export type WeightVisualizationMode =
  | "heatmap"
  | "dominant"
  | "unweighted"
  | "none";
/** Falloff curves used by the weight brush. */
export type WeightFalloff = "linear" | "smooth" | "sharp";

/** Current settings for the active weight brush. */
export interface WeightBrushSettings {
  mode: WeightBrushMode;
  radius: number; // world-space units
  strength: number; // 0–1
  falloff: WeightFalloff;
  targetBone: string | null;
  autoNormalize: boolean;
}

/** One bone influence for a single vertex. */
export interface VertexWeight {
  boneIndex: number;
  boneName: string;
  weight: number;
}

/** All weighted bone influences for a single vertex index. */
export interface VertexWeightInfo {
  vertexIndex: number;
  influences: VertexWeight[];
}

/** Skin-weight data stored alongside a model. */
export interface SkinWeightsData {
  /** Ordered list of bone names matching indices */
  boneNames: string[];
  /** Per-vertex weight info (max 4 influences each) */
  vertices: VertexWeightInfo[];
}

/** Aggregate editor state for the model weight painting workflow. */
export interface WeightEditingState {
  visualizationMode: WeightVisualizationMode;
  brushSettings: WeightBrushSettings;
  isPainting: boolean;
  skinData: SkinWeightsData | null;
}

/** Returns the default brush configuration for weight painting. */
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

/** Returns the default weight editor state. */
export function defaultWeightEditingState(): WeightEditingState {
  return {
    visualizationMode: "none",
    brushSettings: defaultWeightBrushSettings(),
    isPainting: false,
    skinData: null,
  };
}
