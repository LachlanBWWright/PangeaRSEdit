import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { playAnimationEventSound } from "./animationSoundPlayer";
import type { AnimationEvent, AnimationInfo } from "./types";
import {
  isPlaySoundEventType,
  type ModelSourceKind,
} from "./animationEventUtils";

const PLAYBACK_EPSILON = 0.001;

interface UseAnimationSoundPlaybackArgs {
  selectedAnimationInfo: AnimationInfo | null;
  selectedEvents: AnimationEvent[];
  currentTime: number;
  isPlaying: boolean;
  gameLabel?: string | null;
  modelSourceKind?: ModelSourceKind | null;
}

export function useAnimationSoundPlayback({
  selectedAnimationInfo,
  selectedEvents,
  currentTime,
  isPlaying,
  gameLabel,
  modelSourceKind,
}: UseAnimationSoundPlaybackArgs) {
  const lastAnimationKeyRef = useRef<string | null>(null);
  const lastTimeRef = useRef(0);

  const soundEvents = useMemo(
    () =>
      selectedEvents
        .filter((event) => isPlaySoundEventType(event.type))
        .sort((left, right) => left.time - right.time),
    [selectedEvents],
  );

  const previewSoundEvent = useCallback(
    (event: AnimationEvent) => {
      if (!isPlaySoundEventType(event.type)) {
        return;
      }

      void playAnimationEventSound(event.value, modelSourceKind, gameLabel)
        .mapErr((error) => {
          toast.error("Sound preview failed", {
            description: error,
          });
          return error;
        })
        .match(
          () => undefined,
          () => undefined,
        );
    },
    [gameLabel, modelSourceKind],
  );

  useEffect(() => {
    const animationKey = selectedAnimationInfo
      ? `${selectedAnimationInfo.index}:${selectedAnimationInfo.name}`
      : null;

    if (!animationKey) {
      lastAnimationKeyRef.current = null;
      lastTimeRef.current = 0;
      return;
    }

    if (lastAnimationKeyRef.current !== animationKey) {
      lastAnimationKeyRef.current = animationKey;
      lastTimeRef.current = currentTime;
      return;
    }

    if (!isPlaying) {
      lastTimeRef.current = currentTime;
      return;
    }

    const previousTime = lastTimeRef.current;
    const nextTime = currentTime;

    if (Math.abs(nextTime - previousTime) <= PLAYBACK_EPSILON) {
      return;
    }

    const looped = nextTime + PLAYBACK_EPSILON < previousTime;
    const crossedEvents = soundEvents.filter((event) =>
      looped
        ? event.time > previousTime - PLAYBACK_EPSILON ||
          event.time <= nextTime + PLAYBACK_EPSILON
        : event.time > previousTime - PLAYBACK_EPSILON &&
          event.time <= nextTime + PLAYBACK_EPSILON,
    );

    lastTimeRef.current = nextTime;

    crossedEvents.forEach((event) => {
      void playAnimationEventSound(event.value, modelSourceKind, gameLabel)
        .mapErr((error) => {
          console.warn("Animation sound playback failed", {
            error,
            event,
            gameLabel,
            modelSourceKind,
          });
          return error;
        })
        .match(
          () => undefined,
          () => undefined,
        );
    });
  }, [
    currentTime,
    gameLabel,
    isPlaying,
    modelSourceKind,
    selectedAnimationInfo,
    soundEvents,
  ]);

  return { previewSoundEvent };
}
