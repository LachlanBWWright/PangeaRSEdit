import type { Dispatch, SetStateAction } from "react";
import type { AnimationInfo } from "@/components/AnimationViewer/types";

export interface AnimationSourceOption {
  readonly id: string;
  readonly name: string;
}

/** Maps editable animations to the select options used by the creation dialog. */
export function toAnimationSourceOptions(
  editableAnimations: readonly AnimationInfo[],
): AnimationSourceOption[] {
  return editableAnimations.map((anim) => ({
    id: String(anim.index),
    name: anim.name,
  }));
}

/** Creates a handler that resets the source animation whenever the dialog opens. */
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

/** Creates the submit handler used to create a new animation from the selected source. */
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
