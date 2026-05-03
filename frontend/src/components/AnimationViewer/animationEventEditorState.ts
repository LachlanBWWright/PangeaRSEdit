import type { AnimationEvent } from "@/components/AnimationViewer/types";
import {
  getAnimationEventValueOptions,
  type ModelSourceKind,
} from "@/components/AnimationViewer/utils";

/** Returns a new animation event with the provided partial patch applied. */
export function updateAnimationEvent(
  event: AnimationEvent,
  patch: Partial<AnimationEvent>,
): AnimationEvent {
  return {
    time: event.time,
    type: event.type,
    value: event.value,
    ...patch,
  };
}

/** Parses an animation event time input, returning null when blank or invalid. */
export function parseEventTimeInput(value: string): number | null {
  if (value.trim().length === 0) {
    return null;
  }

  const nextTime = Math.round(Number.parseFloat(value));
  if (!Number.isFinite(nextTime) || nextTime < 0) {
    return null;
  }
  return nextTime;
}

/** Parses an integer event field, returning null when blank or invalid. */
export function parseEventIntegerInput(value: string): number | null {
  if (value.trim().length === 0) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

/** Picks a safe default value for the next event type when the current value no longer applies. */
export function getFallbackEventValueForType(
  currentValue: number,
  nextType: number,
  modelSourceKind: ModelSourceKind | null | undefined,
  gameLabel: string | null | undefined,
): number {
  const nextOptions = getAnimationEventValueOptions(
    nextType,
    modelSourceKind,
    gameLabel,
  );
  if (nextOptions.length === 0) {
    return currentValue;
  }

  const firstOption = nextOptions[0];
  if (!firstOption) {
    return currentValue;
  }
  const parsedOption = Number.parseInt(firstOption.value, 10);
  return Number.isFinite(parsedOption) ? parsedOption : 0;
}
