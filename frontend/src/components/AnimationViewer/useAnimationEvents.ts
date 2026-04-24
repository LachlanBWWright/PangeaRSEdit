import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AnimationEvent, AnimationInfo, AnimationMetadata } from "./types";

interface UseAnimationEventsParams {
  selectedAnimationInfo: AnimationInfo | null;
  selectedMetadata: AnimationMetadata | undefined;
  currentTime: number;
  onAnimationEventsChange?: (
    animationIndex: number,
    events: AnimationEvent[],
  ) => void;
}

export interface AnimationEventsController {
  selectedEvents: AnimationEvent[];
  selectedEventIndex: number | null;
  setSelectedEventIndex: Dispatch<SetStateAction<number | null>>;
  handleSelectEvent: (index: number) => void;
  handleNewEvent: () => void;
  handleUpdateEvent: (index: number, event: AnimationEvent) => void;
  handleDeleteEvent: (index: number) => void;
  clearSelection: () => void;
  dropAnimationEvents: (animationIndex: number) => void;
}

export function useAnimationEvents({
  selectedAnimationInfo,
  selectedMetadata,
  currentTime,
  onAnimationEventsChange,
}: UseAnimationEventsParams): AnimationEventsController {
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(
    null,
  );
  const [draftEventsByAnimation, setDraftEventsByAnimation] = useState<
    Record<number, AnimationEvent[]>
  >({});

  const selectedEvents = useMemo(() => {
    if (!selectedAnimationInfo) {
      return [];
    }
    return (
      draftEventsByAnimation[selectedAnimationInfo.index] ??
      selectedMetadata?.events ??
      []
    );
  }, [draftEventsByAnimation, selectedAnimationInfo, selectedMetadata?.events]);

  const commitSelectedEvents = (
    events: AnimationEvent[],
    nextSelectedIndex: number | null,
  ) => {
    if (!selectedAnimationInfo) {
      return;
    }
    const normalized = events.map((event) => ({
      time: Number.isFinite(event.time) ? event.time : 0,
      type: Number.isFinite(event.type) ? event.type : 0,
      value: Number.isFinite(event.value) ? event.value : 0,
    }));
    setDraftEventsByAnimation((prev) => ({
      ...prev,
      [selectedAnimationInfo.index]: normalized,
    }));
    setSelectedEventIndex(nextSelectedIndex);
    onAnimationEventsChange?.(selectedAnimationInfo.index, normalized);
  };

  const handleSelectEvent = (index: number) => {
    const event = selectedEvents[index];
    if (!event) {
      return;
    }
    setSelectedEventIndex(index);
  };

  const handleNewEvent = () => {
    if (!selectedAnimationInfo) {
      return;
    }
    const time = Math.max(0, Math.round(currentTime * 30));
    const nextEvents = [...selectedEvents, { time, type: 0, value: 0 }];
    const nextIndex = nextEvents.length - 1;
    commitSelectedEvents(nextEvents, nextIndex);
  };

  const handleUpdateEvent = (index: number, event: AnimationEvent) => {
    if (!selectedAnimationInfo || index < 0 || index >= selectedEvents.length) {
      return;
    }
    const nextEvents = selectedEvents.map((current, currentIndex) =>
      currentIndex === index ? event : current,
    );
    commitSelectedEvents(nextEvents, index);
  };

  const handleDeleteEvent = (index: number) => {
    if (!selectedAnimationInfo || index < 0 || index >= selectedEvents.length) {
      return;
    }
    const nextEvents = selectedEvents.filter(
      (_, currentIndex) => currentIndex !== index,
    );
    const nextIndex =
      nextEvents.length === 0 ? null : Math.min(index, nextEvents.length - 1);
    commitSelectedEvents(nextEvents, nextIndex);
  };

  const clearSelection = () => {
    setSelectedEventIndex(null);
  };

  const dropAnimationEvents = (animationIndex: number) => {
    setDraftEventsByAnimation((prev) => {
      return Object.fromEntries(
        Object.entries(prev).filter(([key]) => key !== String(animationIndex)),
      );
    });
  };

  return {
    selectedEvents,
    selectedEventIndex,
    setSelectedEventIndex,
    handleSelectEvent,
    handleNewEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    clearSelection,
    dropAnimationEvents,
  };
}
