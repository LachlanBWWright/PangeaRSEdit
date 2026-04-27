/**
 * Animation Viewer type definitions
 */

import { AnimationClip } from "three";
import type { ModelSourceKind } from "./utils";
import type { BoneInfluenceRow } from "./rigToolsState";

export interface AnimationEvent {
  time: number;
  type: number;
  value: number;
}

export interface AnimationInfo {
  name: string;
  duration: number;
  index: number;
  clip: AnimationClip;
  loop?: boolean;
  loopMode?: import("./hooks").LoopMode;
}

export interface AnimationMetadata {
  eventCount: number;
  events: AnimationEvent[];
}

export interface AnimationViewerProps {
  animations: AnimationInfo[];
  animationMixer: import("three").AnimationMixer | null;
  gameLabel?: string | null;
  modelSourceKind?: ModelSourceKind | null;
  onAnimationChange?: (animationIndex: number | null) => void;
  onAnimationsChange?: (animations: AnimationInfo[]) => void;
  onBoneSelectionChange?: (boneName: string | null) => void;
  onAnimationEventsChange?: (
    animationIndex: number,
    events: AnimationEvent[],
  ) => void;
  animationMetadata?: Record<string, AnimationMetadata>;
  boneTransform?: [number, number, number] | null;
  boneRotation?: [number, number, number, number] | null;
  boneScale?: [number, number, number] | null;
  onGizmoModeChange?: (mode: import("@/components/model-viewer/types").GizmoMode) => void;
  boneRenameInput?: string;
  boneInfluenceRows?: BoneInfluenceRow[];
  skinData?: import("@/modelEditing/weights/weightTypes").SkinWeightsData | null;
  onBoneRenameInputChange?: (value: string) => void;
  onRenameSelectedBone?: () => void;
  onRepairWeights?: (repaired: import("@/modelEditing/weights/weightTypes").SkinWeightsData) => void;
}

export interface TimelineRow {
  boneName: string;
  times: number[];
}

export interface Keyframe {
  time: number;
  values: number[];
}
