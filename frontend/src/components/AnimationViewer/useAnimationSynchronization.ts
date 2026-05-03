import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { reindexAnimations } from "./hooks";
import type { AnimationInfo } from "./types";

interface UseAnimationSynchronizationParams {
  animations: AnimationInfo[];
  onAnimationsChange?: (animations: AnimationInfo[]) => void;
  draftAnimations: AnimationInfo[] | null;
  baseAnimations: AnimationInfo[];
  selectedAnimation: number | null;
  setDraftAnimations: Dispatch<SetStateAction<AnimationInfo[] | null>>;
}

export function useAnimationSynchronization({
  animations,
  onAnimationsChange,
  draftAnimations,
  baseAnimations,
  selectedAnimation,
  setDraftAnimations,
}: UseAnimationSynchronizationParams) {
  const autoNameCounterRef = useRef(animations.length + 1);
  const onAnimationsChangeRef = useRef(onAnimationsChange);

  useEffect(() => {
    onAnimationsChangeRef.current = onAnimationsChange;
  }, [onAnimationsChange]);

  useEffect(() => {
    if (!draftAnimations) {
      return;
    }

    onAnimationsChangeRef.current?.(
      reindexAnimations(
        draftAnimations.map((animation) => ({
          ...animation,
          clip: animation.clip.clone(),
        })),
      ),
    );
  }, [draftAnimations]);

  useEffect(() => {
    autoNameCounterRef.current = animations.length + 1;
  }, [animations.length]);

  const updateSelectedAnimation = useCallback(
    (updater: (current: AnimationInfo) => AnimationInfo) => {
      if (selectedAnimation === null) {
        return;
      }
      setDraftAnimations((prev) => {
        const currentAnimations = prev ?? baseAnimations;
        return reindexAnimations(
          currentAnimations.map((anim, index) =>
            index === selectedAnimation ? updater(anim) : anim,
          ),
        );
      });
    },
    [baseAnimations, selectedAnimation, setDraftAnimations],
  );

  return {
    autoNameCounterRef,
    updateSelectedAnimation,
  };
}
