/**
 * Animation Viewer type definitions
 */

import { AnimationClip } from "three";
import type { ModelSourceKind } from "./utils";

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
}

export interface TimelineRow {
  boneName: string;
  times: number[];
}

export interface Keyframe {
  time: number;
  values: number[];
}
