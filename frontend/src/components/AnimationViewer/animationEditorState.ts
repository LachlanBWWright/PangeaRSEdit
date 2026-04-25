import type { AnimationInfo } from "@/components/AnimationViewer/types";
import type { LoopMode } from "@/components/AnimationViewer/hooks";

export function getEffectiveLoopMode(animationInfo: AnimationInfo): LoopMode {
  return animationInfo.loopMode ?? (animationInfo.loop ? "loop" : "once");
}

export function asLoopMode(value: string): LoopMode | null {
  if (value === "loop" || value === "pingpong" || value === "once") {
    return value;
  }
  return null;
}

export function getPlaybackModeDescription(mode: LoopMode): string {
  if (mode === "loop") {
    return "Animation repeats from start when finished.";
  }
  if (mode === "pingpong") {
    return "Animation plays forward then backward (zigzag).";
  }
  return "Animation plays once and stops at the end.";
}

export function getDurationModeDescription(mode: "scale" | "truncate"): string {
  if (mode === "scale") {
    return "Keyframes will be scaled proportionally to the new duration.";
  }
  return "Keyframes beyond the new duration will be removed.";
}

export function canApplyAnimationEdit(
  selectedAnimationInfo: AnimationInfo,
  editName: string,
  editDurationInput: string,
): boolean {
  return !(
    editName === selectedAnimationInfo.name &&
    editDurationInput === String(selectedAnimationInfo.duration)
  );
}

export function confirmDeleteAnimation(name: string): boolean {
  return window.confirm(`Delete animation "${name}"?`);
}
