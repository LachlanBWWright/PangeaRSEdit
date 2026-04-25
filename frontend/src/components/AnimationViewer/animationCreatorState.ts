import type { Dispatch, SetStateAction } from "react";
import type { AnimationInfo } from "@/components/AnimationViewer/types";

export interface AnimationSourceOption {
  readonly id: string;
  readonly name: string;
}

export function toAnimationSourceOptions(
  editableAnimations: readonly AnimationInfo[],
): AnimationSourceOption[] {
  return editableAnimations.map((anim) => ({
    id: String(anim.index),
    name: anim.name,
  }));
}

export function createAnimationDialogOpenHandler(
  setOpen: Dispatch<SetStateAction<boolean>>,
  setSourceAnimation: Dispatch<SetStateAction<string>>,
): (nextOpen: boolean) => void {
  return (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setSourceAnimation("none");
    }
  };
}

export function createAnimationSubmitHandler(
  sourceAnimation: string,
  onCreate: (sourceAnimationIndex: number | null) => void,
  setOpen: Dispatch<SetStateAction<boolean>>,
): () => void {
  return () => {
    const parsedSourceIndex =
      sourceAnimation === "none" ? null : Number.parseInt(sourceAnimation, 10);
    onCreate(Number.isNaN(parsedSourceIndex) ? null : parsedSourceIndex);
    setOpen(false);
  };
}
