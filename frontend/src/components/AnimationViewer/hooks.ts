/**
 * Animation Viewer React hooks for animation state management
 */

import { useState, useRef, useEffect } from "react";
import { AnimationMixer, AnimationAction, LoopOnce, LoopRepeat, LoopPingPong } from "three";
import type { AnimationInfo } from "./types";
import { FALLBACK_LOOP_VALUE, MIN_PLAYBACK_RATIO } from "./utils";

export type LoopMode = "loop" | "pingpong" | "once";

export const reindexAnimations = (items: AnimationInfo[]) =>
  items.map((anim, index) => ({
    ...anim,
    index,
    loop: anim.loop ?? FALLBACK_LOOP_VALUE,
  }));

export const configureActionLoop = (action: AnimationAction, loop: boolean, loopMode?: LoopMode) => {
  if (loopMode === "pingpong") {
    action.setLoop(LoopPingPong, Infinity);
    action.clampWhenFinished = false;
  } else if (loop || loopMode === "loop") {
    action.setLoop(LoopRepeat, Infinity);
    action.clampWhenFinished = false;
  } else {
    action.setLoop(LoopOnce, 0);
    action.clampWhenFinished = true;
  }
};

export const syncAnimationActionTime = (
  animationMixer: AnimationMixer | null,
  action: AnimationAction | null,
  time: number,
) => {
  if (!animationMixer || !action) {
    return;
  }
  action.time = time;
  animationMixer.update(0);
};

export function useAnimationPlayback(
  animationMixer: AnimationMixer | null,
  selectedAnimation: number | null,
  editableAnimations: AnimationInfo[],
  onAnimationChange?: (animationIndex: number | null) => void,
) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasActiveAction, setHasActiveAction] = useState(false);

  const animationRequestRef = useRef<number | undefined>(undefined);
  const currentActionRef = useRef<AnimationAction | null>(null);
  const isPlayingRef = useRef(false);
  const lastSelectionRef = useRef<number | null>(null);

  const setPlayingState = (value: boolean) => {
    isPlayingRef.current = value;
    setIsPlaying(value);
  };

  // Update animation state when mixer or selection changes
  useEffect(() => {
    const animationInfo =
      selectedAnimation !== null ? editableAnimations[selectedAnimation] : null;
    if (!animationMixer || !animationInfo) {
      Promise.resolve().then(() => {
        setDuration(0);
        setCurrentTime(0);
        setPlayingState(false);
        setHasActiveAction(false);
      });
      if (currentActionRef.current) {
        currentActionRef.current.stop();
        currentActionRef.current = null;
      }
      lastSelectionRef.current = selectedAnimation;
      onAnimationChange?.(null);
      return;
    }

    const clip = animationInfo.clip;
    const isNewSelection = lastSelectionRef.current !== selectedAnimation;
    const previousAction = currentActionRef.current;
    const previousDuration = previousAction?.getClip().duration ?? clip.duration;
    const previousTime = previousAction?.time ?? 0;
    const previousRatio =
      previousDuration > 0 ? previousTime / previousDuration : 0;
    if (previousAction) {
      previousAction.stop();
    }
    const action = animationMixer.clipAction(clip);
    action.reset();
    configureActionLoop(action, animationInfo.loop ?? true, animationInfo.loopMode);
    if (!isNewSelection && previousRatio >= MIN_PLAYBACK_RATIO) {
      action.time = Math.min(clip.duration, previousRatio * clip.duration);
    }
    currentActionRef.current = action;
    const shouldPlay = isNewSelection || isPlayingRef.current;
    if (shouldPlay) {
      action.play();
      action.paused = false;
    } else {
      action.play();
      action.paused = true;
    }
    syncAnimationActionTime(animationMixer, action, action.time);
    Promise.resolve().then(() => {
      setDuration(clip.duration);
      setCurrentTime(action.time);
      setHasActiveAction(true);
      setPlayingState(shouldPlay);
    });
    lastSelectionRef.current = selectedAnimation;
    onAnimationChange?.(selectedAnimation);
  }, [selectedAnimation, animationMixer, editableAnimations, onAnimationChange]);

  // Animation loop for updating time
  useEffect(() => {
    const updateTime = () => {
      if (animationMixer && currentActionRef.current && isPlaying) {
        const time = currentActionRef.current.time ?? 0;
        setCurrentTime(time);

        if (time >= duration && duration > 0) {
          currentActionRef.current.time = 0;
          setCurrentTime(0);
        }
      }

      if (isPlaying) {
        animationRequestRef.current = requestAnimationFrame(updateTime);
      }
    };

    if (isPlaying) {
      animationRequestRef.current = requestAnimationFrame(updateTime);
    }

    return () => {
      if (animationRequestRef.current) {
        cancelAnimationFrame(animationRequestRef.current);
      }
    };
  }, [isPlaying, duration, animationMixer]);

  return {
    isPlaying,
    currentTime,
    duration,
    hasActiveAction,
    currentActionRef,
    setPlayingState,
    setCurrentTime,
    setDuration,
  };
}
