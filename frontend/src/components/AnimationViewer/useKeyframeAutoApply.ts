import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import {
  AnimationClip,
  QuaternionKeyframeTrack,
  VectorKeyframeTrack,
} from "three";
import type { AnimationAction, AnimationMixer, KeyframeTrack } from "three";
import { syncAnimationActionTime } from "./hooks";
import type { AnimationInfo } from "./types";
import { KEYFRAME_TIME_EPSILON, type TrackProperty } from "./utils";
import type { KeyframeHistorySnapshot } from "./useKeyframeHistory";

interface UseKeyframeAutoApplyParams {
  animationMixer: AnimationMixer | null;
  currentActionRef: MutableRefObject<AnimationAction | null>;
  selectedAnimationInfo: AnimationInfo | null;
  selectedBoneName: string;
  selectedTrackProperty: TrackProperty;
  selectedTrack: KeyframeTrack | null;
  selectedKeyframeIndex: number | null;
  selectedTrackConfig: {
    trackName: string;
    components: string[];
  };
  isCreatingKeyframe: boolean;
  keyframeTimeInput: string;
  keyframeValueInputs: string[];
  keyframeHistoryLockRef: MutableRefObject<boolean>;
  lastKeyframeSaveSignatureRef: MutableRefObject<string | null>;
  makeKeyframeSignature: (
    animationIndex: number | null,
    boneName: string,
    trackProperty: TrackProperty,
    keyframeIndex: number | null,
    timeInput: string,
    valueInputs: string[],
    creating: boolean,
  ) => string;
  captureKeyframeSnapshot: () => KeyframeHistorySnapshot;
  setKeyframeUndoStack: Dispatch<SetStateAction<KeyframeHistorySnapshot[]>>;
  setKeyframeRedoStack: Dispatch<SetStateAction<KeyframeHistorySnapshot[]>>;
  updateSelectedAnimation: (
    updater: (current: AnimationInfo) => AnimationInfo,
  ) => void;
  setSelectedKeyframeIndex: Dispatch<SetStateAction<number | null>>;
  setKeyframeTimeInput: Dispatch<SetStateAction<string>>;
  setKeyframeValueInputs: Dispatch<SetStateAction<string[]>>;
  setIsCreatingKeyframe: Dispatch<SetStateAction<boolean>>;
  setKeyframeError: Dispatch<SetStateAction<string | null>>;
  setCurrentTime: Dispatch<SetStateAction<number>>;
}

export function useKeyframeAutoApply({
  animationMixer,
  currentActionRef,
  selectedAnimationInfo,
  selectedBoneName,
  selectedTrackProperty,
  selectedTrack,
  selectedKeyframeIndex,
  selectedTrackConfig,
  isCreatingKeyframe,
  keyframeTimeInput,
  keyframeValueInputs,
  keyframeHistoryLockRef,
  lastKeyframeSaveSignatureRef,
  makeKeyframeSignature,
  captureKeyframeSnapshot,
  setKeyframeUndoStack,
  setKeyframeRedoStack,
  updateSelectedAnimation,
  setSelectedKeyframeIndex,
  setKeyframeTimeInput,
  setKeyframeValueInputs,
  setIsCreatingKeyframe,
  setKeyframeError,
  setCurrentTime,
}: UseKeyframeAutoApplyParams) {
  useEffect(() => {
    if (!selectedAnimationInfo || !selectedBoneName) {
      return;
    }
    if (selectedKeyframeIndex === null && !isCreatingKeyframe) {
      lastKeyframeSaveSignatureRef.current = null;
      return;
    }
    if (keyframeHistoryLockRef.current) {
      return;
    }

    const signature = makeKeyframeSignature(
      selectedAnimationInfo.index,
      selectedBoneName,
      selectedTrackProperty,
      selectedKeyframeIndex,
      keyframeTimeInput,
      keyframeValueInputs,
      isCreatingKeyframe,
    );
    if (signature === lastKeyframeSaveSignatureRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!selectedAnimationInfo || !selectedBoneName) {
        return;
      }
      if (selectedKeyframeIndex === null && !isCreatingKeyframe) {
        return;
      }
      if (keyframeHistoryLockRef.current) {
        return;
      }

      const timeValue = Number(keyframeTimeInput);
      const componentCount = selectedTrackConfig.components.length;
      if (
        !Number.isFinite(timeValue) ||
        timeValue < 0 ||
        keyframeValueInputs.length !== componentCount
      ) {
        return;
      }
      const parsedValues = keyframeValueInputs.map((value) => Number(value));
      if (parsedValues.some((value) => !Number.isFinite(value))) {
        return;
      }

      const trackName = `${selectedBoneName}.${selectedTrackConfig.trackName}`;
      const currentTrack = selectedTrack ?? null;
      const stride = componentCount;
      let times: number[] = [];
      let values: number[] = [];
      if (currentTrack) {
        times = Array.from(currentTrack.times);
        values = Array.from(currentTrack.values);
      }
      if (
        currentTrack &&
        selectedKeyframeIndex !== null &&
        selectedKeyframeIndex < times.length
      ) {
        times[selectedKeyframeIndex] = timeValue;
        parsedValues.forEach((value, offset) => {
          values[selectedKeyframeIndex * stride + offset] = value;
        });
      } else {
        times.push(timeValue);
        values.push(...parsedValues);
      }
      const combined = times.map((time, index) => ({
        time,
        values: values.slice(index * stride, index * stride + stride),
      }));
      combined.sort((a, b) => a.time - b.time);
      const nextTimes = combined.map((entry) => entry.time);
      const nextValues = combined.flatMap((entry) => entry.values);
      const updatedIndex = combined.findIndex(
        (entry) =>
          Math.abs(entry.time - timeValue) < KEYFRAME_TIME_EPSILON &&
          entry.values.length === parsedValues.length &&
          entry.values.every((value, offset) => value === parsedValues[offset]),
      );
      const nextIndex =
        updatedIndex >= 0
          ? updatedIndex
          : (selectedKeyframeIndex ?? combined.length - 1);
      const nextTrack = currentTrack
        ? currentTrack.clone()
        : selectedTrackConfig.trackName === "quaternion"
          ? new QuaternionKeyframeTrack(trackName, nextTimes, nextValues)
          : new VectorKeyframeTrack(trackName, nextTimes, nextValues);
      nextTrack.times = new Float32Array(nextTimes);
      nextTrack.values = new Float32Array(nextValues);
      const nextTracks = selectedAnimationInfo.clip.tracks
        .filter((track) => track !== currentTrack)
        .concat(nextTrack);
      const nextClip = new AnimationClip(
        selectedAnimationInfo.name,
        selectedAnimationInfo.duration,
        nextTracks,
      );

      keyframeHistoryLockRef.current = true;
      setKeyframeUndoStack((stack) => [...stack, captureKeyframeSnapshot()]);
      setKeyframeRedoStack([]);
      updateSelectedAnimation((anim) => ({
        ...anim,
        clip: nextClip,
      }));
      const selectedEntry = combined[nextIndex];
      if (selectedEntry) {
        setSelectedKeyframeIndex(nextIndex);
        setKeyframeTimeInput(selectedEntry.time.toString());
        setKeyframeValueInputs(
          selectedEntry.values.map((value) => value.toString()),
        );
        if (currentActionRef.current?.paused) {
          syncAnimationActionTime(
            animationMixer,
            currentActionRef.current,
            selectedEntry.time,
          );
          setCurrentTime(selectedEntry.time);
        }
      }
      setIsCreatingKeyframe(false);
      setKeyframeError(null);
      lastKeyframeSaveSignatureRef.current = makeKeyframeSignature(
        selectedAnimationInfo.index,
        selectedBoneName,
        selectedTrackProperty,
        nextIndex,
        selectedEntry?.time.toString() ?? timeValue.toString(),
        selectedEntry
          ? selectedEntry.values.map((value) => value.toString())
          : parsedValues.map((value) => value.toString()),
        false,
      );
      window.setTimeout(() => {
        keyframeHistoryLockRef.current = false;
      }, 0);
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    animationMixer,
    captureKeyframeSnapshot,
    currentActionRef,
    isCreatingKeyframe,
    keyframeHistoryLockRef,
    keyframeTimeInput,
    keyframeValueInputs,
    lastKeyframeSaveSignatureRef,
    makeKeyframeSignature,
    selectedAnimationInfo,
    selectedBoneName,
    selectedKeyframeIndex,
    selectedTrack,
    selectedTrackConfig.components.length,
    selectedTrackConfig.trackName,
    selectedTrackProperty,
    setCurrentTime,
    setIsCreatingKeyframe,
    setKeyframeError,
    setKeyframeRedoStack,
    setKeyframeTimeInput,
    setKeyframeUndoStack,
    setKeyframeValueInputs,
    setSelectedKeyframeIndex,
    updateSelectedAnimation,
  ]);
}
