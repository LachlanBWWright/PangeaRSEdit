/** Types for model hierarchy and node management. */
import { Object3D, Group, AnimationMixer } from "three";
import { AnimationInfo } from "@/components/AnimationViewer";
import { Game } from "@/data/globals/globals";
import type {
  SkinWeightsData,
  WeightBrushSettings,
  WeightVisualizationMode,
} from "@/modelEditing/weights/weightTypes";
import type { WeightBrushHit } from "@/modelEditing/weights/weightBrushStroke";

/** Gizmo modes supported by the model viewer. */
export type GizmoMode = "translate" | "rotate" | "scale";
/** High-level interaction modes supported by the model viewer. */
export type ViewerInteractionMode = "navigate" | "paint-weights" | "bone-edit";

/** Flattened representation of a node in the model hierarchy tree. */
export interface ModelNode {
  name: string;
  type: "mesh" | "node" | "group";
  visible: boolean;
  children?: ModelNode[];
  meshIndex?: number;
  nodeIndex?: number;
  polyCount?: number;
  // Reference to the original THREE.Object3D for proper matching
  threeObject?: Object3D;
}

/** Props consumed by the 3D model canvas component. */
export interface ModelCanvasProps {
  gltfUrl: string;
  setModelNodes: (nodes: ModelNode[]) => void;
  onSceneReady?: (scene: Group | undefined) => void;
  onAnimationsReady?: (
    animations: AnimationInfo[],
    mixer: AnimationMixer | null,
  ) => void;
  onBoneTransformChange?: (position: [number, number, number]) => void;
  onBoneRotationChange?: (quaternion: [number, number, number, number]) => void;
  onBoneScaleChange?: (scale: [number, number, number]) => void;
  wireframeMode?: boolean;
  showSkeleton?: boolean;
  logBonePositions?: boolean;
  selectedBoneName?: string | null;
  gameType?: Game;
  gizmoMode?: GizmoMode;
  interactionMode?: ViewerInteractionMode;
  previewLighting?: boolean;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  skinData?: SkinWeightsData | null;
  weightBrushSettings?: WeightBrushSettings | null;
  weightVisualizationMode?: WeightVisualizationMode;
  onWeightBrushStroke?: (hit: WeightBrushHit) => void;
  sceneUpdateRevision?: number;
}
