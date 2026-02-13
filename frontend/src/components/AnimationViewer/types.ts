/**
 * Animation Viewer type definitions
 */

import { AnimationClip } from "three";

export interface AnimationInfo {
  name: string;
  duration: number;
  index: number;
  clip: AnimationClip;
  loop?: boolean;
}

export interface AnimationMetadata {
  eventCount: number;
  events: { time: number; type: number; value: number }[];
}

export interface AnimationViewerProps {
  animations: AnimationInfo[];
  animationMixer: import("three").AnimationMixer | null;
  onAnimationChange?: (animationIndex: number | null) => void;
  onBoneSelectionChange?: (boneName: string | null) => void;
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
