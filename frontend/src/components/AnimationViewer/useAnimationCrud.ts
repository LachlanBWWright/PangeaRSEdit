import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { AnimationClip } from "three";
import { reindexAnimations, type LoopMode } from "./hooks";
import type { AnimationInfo } from "./types";
import {
  DEFAULT_ANIMATION_DURATION,
  durationErrorMessage,
  extractBoneNames,
  parseDurationInputValue,
  type TrackProperty,
} from "./utils";

interface UseAnimationCrudParams {
  editableAnimations: AnimationInfo[];
  baseAnimations: AnimationInfo[];
  selectedAnimation: number | null;
  selectedAnimationInfo: AnimationInfo | null;
  editName: string;
  editDurationInput: string;
  newAnimationName: string;
  newAnimationDurationInput: string;
  durationMode: "scale" | "truncate";
  autoNameCounterRef: MutableRefObject<number>;
  setDraftAnimations: Dispatch<SetStateAction<AnimationInfo[] | null>>;
  setSelectedAnimation: Dispatch<SetStateAction<number | null>>;
  setEditName: Dispatch<SetStateAction<string>>;
  setEditDurationInput: Dispatch<SetStateAction<string>>;
  setSelectedBoneName: Dispatch<SetStateAction<string>>;
  setSelectedTrackProperty: Dispatch<SetStateAction<TrackProperty>>;
  setSelectedKeyframeIndex: Dispatch<SetStateAction<number | null>>;
  setIsCreatingKeyframe: Dispatch<SetStateAction<boolean>>;
  setKeyframeTimeInput: Dispatch<SetStateAction<string>>;
  setKeyframeValueInputs: Dispatch<SetStateAction<string[]>>;
  setKeyframeError: Dispatch<SetStateAction<string | null>>;
  setDurationError: Dispatch<SetStateAction<string | null>>;
  resetKeyframeHistory: () => void;
  clearEventSelection: () => void;
  dropAnimationEvents: (animationIndex: number) => void;
}

interface AnimationCrudHandlers {
  handleUpdateAnimation: () => void;
  handleCreateAnimation: (sourceAnimationIndex: number | null) => void;
  handleLoopModeChange: (mode: LoopMode) => void;
  handleApplyDuration: () => void;
  handleDeleteAnimation: () => void;
  handleAnimationSelectionChange: (value: string) => void;
  handleApplyEditorChanges: () => void;
}

export function useAnimationCrud({
  editableAnimations,
  baseAnimations,
  selectedAnimation,
  selectedAnimationInfo,
  editName,
  editDurationInput,
  newAnimationName,
  newAnimationDurationInput,
  durationMode,
  autoNameCounterRef,
  setDraftAnimations,
  setSelectedAnimation,
  setEditName,
  setEditDurationInput,
  setSelectedBoneName,
  setSelectedTrackProperty,
  setSelectedKeyframeIndex,
  setIsCreatingKeyframe,
  setKeyframeTimeInput,
  setKeyframeValueInputs,
  setKeyframeError,
  setDurationError,
  resetKeyframeHistory,
  clearEventSelection,
  dropAnimationEvents,
}: UseAnimationCrudParams): AnimationCrudHandlers {
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

  const handleUpdateAnimation = useCallback(() => {
    if (selectedAnimation === null) return;
    const current = editableAnimations[selectedAnimation];
    if (!current) return;
    const trimmedName = editName.trim();
    const nextName =
      trimmedName.length > 0
        ? trimmedName
        : `Animation ${selectedAnimation + 1}`;
    const nextLoop = current.loop ?? true;
    const clip = current.clip.clone();
    clip.name = nextName;
    updateSelectedAnimation((anim) => ({
      ...anim,
      name: nextName,
      clip,
      loop: nextLoop,
    }));
    setEditName(nextName);
    setDurationError(null);
  }, [
    editName,
    editableAnimations,
    selectedAnimation,
    setDurationError,
    setEditName,
    updateSelectedAnimation,
  ]);

  const handleCreateAnimation = useCallback(
    (sourceAnimationIndex: number | null) => {
      resetKeyframeHistory();
      const trimmedName = newAnimationName.trim();
      const nextAutoIndex = autoNameCounterRef.current;
      const nextName =
        trimmedName.length > 0 ? trimmedName : `Animation ${nextAutoIndex}`;
      const parsedDuration = parseDurationInputValue(
        newAnimationDurationInput,
        DEFAULT_ANIMATION_DURATION,
      );
      if (!parsedDuration.valid) {
        setDurationError(durationErrorMessage);
        return;
      }
      const nextDuration = parsedDuration.value;
      const sourceClip =
        sourceAnimationIndex !== null
          ? (editableAnimations[sourceAnimationIndex]?.clip ?? null)
          : null;
      const clip = sourceClip
        ? sourceClip.clone()
        : new AnimationClip(nextName, nextDuration, []);
      clip.name = nextName;
      clip.duration = nextDuration;
      const nextIndex = editableAnimations.length;
      const newInfo: AnimationInfo = {
        name: nextName,
        duration: nextDuration,
        index: nextIndex,
        clip,
        loop: true,
      };
      setDraftAnimations((prev) =>
        reindexAnimations([...(prev ?? baseAnimations), newInfo]),
      );
      setSelectedAnimation(nextIndex);
      setEditName(nextName);
      setEditDurationInput(nextDuration.toString());
      setDurationError(null);
      if (trimmedName.length === 0) {
        autoNameCounterRef.current += 1;
      }
    },
    [
      autoNameCounterRef,
      baseAnimations,
      editableAnimations,
      newAnimationDurationInput,
      newAnimationName,
      resetKeyframeHistory,
      setDraftAnimations,
      setDurationError,
      setEditDurationInput,
      setEditName,
      setSelectedAnimation,
    ],
  );

  const handleLoopModeChange = useCallback(
    (mode: LoopMode) => {
      if (selectedAnimation === null || !selectedAnimationInfo) return;
      updateSelectedAnimation((anim) => ({
        ...anim,
        loop: mode !== "once",
        loopMode: mode,
      }));
    },
    [selectedAnimation, selectedAnimationInfo, updateSelectedAnimation],
  );

  const handleApplyDuration = useCallback(() => {
    if (selectedAnimation === null) return;
    const current = editableAnimations[selectedAnimation];
    if (!current) return;
    const parsedDuration = parseDurationInputValue(
      editDurationInput,
      current.duration,
    );
    if (!parsedDuration.valid) {
      setDurationError(durationErrorMessage);
      return;
    }
    const nextDuration = parsedDuration.value;
    const currentDuration = current.duration > 0 ? current.duration : 1;
    const scale = nextDuration / currentDuration;
    const nextTracks = current.clip.tracks.map((track) => {
      const times = Array.from(track.times);
      const values = Array.from(track.values);
      const stride = track.getValueSize();
      let nextTimes: number[] = [];
      let nextValues: number[] = [];
      if (durationMode === "truncate") {
        times.forEach((time, index) => {
          if (time <= nextDuration) {
            nextTimes.push(time);
            nextValues.push(
              ...values.slice(index * stride, index * stride + stride),
            );
          }
        });
        if (nextTimes.length === 0 && times.length > 0) {
          nextTimes = [0];
          nextValues = values.slice(0, stride);
        }
      } else {
        nextTimes = times.map((time) => time * scale);
        nextValues = values.slice();
      }
      const nextTrack = track.clone();
      nextTrack.times = new Float32Array(nextTimes);
      nextTrack.values = new Float32Array(nextValues);
      return nextTrack;
    });
    const nextClip = new AnimationClip(current.name, nextDuration, nextTracks);
    updateSelectedAnimation((anim) => ({
      ...anim,
      duration: nextDuration,
      clip: nextClip,
    }));
    setEditDurationInput(nextDuration.toString());
    setDurationError(null);
  }, [
    durationMode,
    editDurationInput,
    editableAnimations,
    selectedAnimation,
    setDurationError,
    setEditDurationInput,
    updateSelectedAnimation,
  ]);

  const handleDeleteAnimation = useCallback(() => {
    if (selectedAnimation === null) return;
    resetKeyframeHistory();
    const deletedIndex = selectedAnimation;
    dropAnimationEvents(deletedIndex);
    setDraftAnimations((prev) => {
      const currentAnimations = prev ?? baseAnimations;
      return reindexAnimations(
        currentAnimations.filter((_, index) => index !== deletedIndex),
      );
    });
    setSelectedAnimation((prev) => {
      if (prev === null) return null;
      if (prev === deletedIndex) return null;
      return prev > deletedIndex ? prev - 1 : prev;
    });
    setEditName("");
    setEditDurationInput("");
    setSelectedBoneName("");
    setSelectedKeyframeIndex(null);
    setIsCreatingKeyframe(false);
    setKeyframeTimeInput("");
    setKeyframeValueInputs([]);
    clearEventSelection();
    setKeyframeError(null);
    setDurationError(null);
  }, [
    baseAnimations,
    clearEventSelection,
    dropAnimationEvents,
    resetKeyframeHistory,
    selectedAnimation,
    setDraftAnimations,
    setDurationError,
    setEditDurationInput,
    setEditName,
    setIsCreatingKeyframe,
    setKeyframeError,
    setKeyframeTimeInput,
    setKeyframeValueInputs,
    setSelectedAnimation,
    setSelectedBoneName,
    setSelectedKeyframeIndex,
  ]);

  const handleAnimationSelectionChange = useCallback(
    (value: string) => {
      if (value === "none") {
        resetKeyframeHistory();
        setSelectedAnimation(null);
        setEditName("");
        setEditDurationInput("");
        setSelectedBoneName("");
        setSelectedTrackProperty("position");
        setSelectedKeyframeIndex(null);
        setIsCreatingKeyframe(false);
        setKeyframeTimeInput("");
        setKeyframeValueInputs([]);
        clearEventSelection();
        setKeyframeError(null);
        setDurationError(null);
        return;
      }
      const nextIndex = Number.parseInt(value, 10);
      const resolvedIndex = Number.isNaN(nextIndex) ? null : nextIndex;
      setSelectedAnimation(resolvedIndex);
      const resolvedAnimation =
        resolvedIndex !== null ? editableAnimations[resolvedIndex] : null;
      if (resolvedAnimation) {
        resetKeyframeHistory();
        setEditName(resolvedAnimation.name);
        setEditDurationInput(resolvedAnimation.duration.toString());
        const nextBoneName = extractBoneNames(resolvedAnimation.clip)[0] ?? "";
        setSelectedBoneName(nextBoneName);
        setSelectedTrackProperty("position");
        setSelectedKeyframeIndex(null);
        setIsCreatingKeyframe(false);
        setKeyframeTimeInput("");
        setKeyframeValueInputs([]);
        clearEventSelection();
        setKeyframeError(null);
        setDurationError(null);
      }
    },
    [
      clearEventSelection,
      editableAnimations,
      resetKeyframeHistory,
      setDurationError,
      setEditDurationInput,
      setEditName,
      setIsCreatingKeyframe,
      setKeyframeError,
      setKeyframeTimeInput,
      setKeyframeValueInputs,
      setSelectedAnimation,
      setSelectedBoneName,
      setSelectedKeyframeIndex,
      setSelectedTrackProperty,
    ],
  );

  const handleApplyEditorChanges = useCallback(() => {
    handleUpdateAnimation();
    handleApplyDuration();
  }, [handleApplyDuration, handleUpdateAnimation]);

  return {
    handleUpdateAnimation,
    handleCreateAnimation,
    handleLoopModeChange,
    handleApplyDuration,
    handleDeleteAnimation,
    handleAnimationSelectionChange,
    handleApplyEditorChanges,
  };
}
