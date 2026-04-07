/**
 * AnimationViewer - Main component for viewing and editing animations
 * Refactored into smaller, maintainable sub-components
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { RefObject } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AnimationClip,
  QuaternionKeyframeTrack,
  VectorKeyframeTrack,
} from "three";
import { AnimationSelector } from "./AnimationSelector";
import { AnimationEditor } from "./AnimationEditor";
import { KeyframeEditor } from "./KeyframeEditor";
import { AnimationMetadataDisplay } from "./AnimationMetadataDisplay";
import { AnimationEventEditor } from "./AnimationEventEditor";
import { AnimationCreator } from "./AnimationCreator";
import {
  useAnimationPlayback,
  reindexAnimations,
  syncAnimationActionTime,
  type LoopMode,
} from "./hooks";
import type {
  AnimationEvent,
  AnimationInfo,
  AnimationViewerProps,
} from "./types";
import {
  extractBoneNames,
  parseTrackName,
  parseDurationInputValue,
  TRACK_PROPERTY_CONFIG,
  type TrackProperty,
  DEFAULT_ANIMATION_DURATION,
  KEYFRAME_TIME_EPSILON,
  durationErrorMessage,
} from "./utils";

interface KeyframeHistorySnapshot {
  animations: AnimationInfo[];
  selectedAnimation: number | null;
  selectedBoneName: string;
  selectedTrackProperty: TrackProperty;
  selectedKeyframeIndex: number | null;
  keyframeTimeInput: string;
  keyframeValueInputs: string[];
  isCreatingKeyframe: boolean;
}

export function AnimationViewer({
  animations,
  animationMixer,
  gameLabel,
  modelSourceKind,
  onAnimationChange,
  onAnimationsChange,
  onBoneSelectionChange,
  onAnimationEventsChange,
  animationMetadata,
  boneTransform,
  boneRotation,
  boneScale,
  onGizmoModeChange,
}: AnimationViewerProps) {
  const [draftAnimations, setDraftAnimations] = useState<AnimationInfo[] | null>(
    null,
  );
  const [selectedAnimation, setSelectedAnimation] = useState<number | null>(
    null,
  );
  const [editName, setEditName] = useState("");
  const [editDurationInput, setEditDurationInput] = useState("");
  const [newAnimationName, setNewAnimationName] = useState("New Animation");
  const [newAnimationDurationInput, setNewAnimationDurationInput] = useState(
    DEFAULT_ANIMATION_DURATION.toString(),
  );
  const [durationMode, setDurationMode] = useState<"scale" | "truncate">(
    "scale",
  );
  const [durationError, setDurationError] = useState<string | null>(null);
  const [keyframeError, setKeyframeError] = useState<string | null>(null);
  const [selectedBoneName, setSelectedBoneName] = useState("");
  const [selectedTrackProperty, setSelectedTrackProperty] =
    useState<TrackProperty>("position");
  const [selectedKeyframeIndex, setSelectedKeyframeIndex] = useState<
    number | null
  >(null);
  const [isCreatingKeyframe, setIsCreatingKeyframe] = useState(false);
  const [keyframeTimeInput, setKeyframeTimeInput] = useState("");
  const [keyframeValueInputs, setKeyframeValueInputs] = useState<string[]>([]);
  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(
    null,
  );
  const [draftEventsByAnimation, setDraftEventsByAnimation] = useState<
    Record<number, AnimationEvent[]>
  >({});
  const [keyframeUndoStack, setKeyframeUndoStack] = useState<
    KeyframeHistorySnapshot[]
  >([]);
  const [keyframeRedoStack, setKeyframeRedoStack] = useState<
    KeyframeHistorySnapshot[]
  >([]);
  const autoNameCounterRef = useRef(animations.length + 1);
  const keyframeHistoryLockRef = useRef(false);
  const pendingTimelineSelectionRef = useRef<{
    boneName: string;
    time: number;
    property: TrackProperty;
  } | null>(null);
  const editKeyframesSectionRef = useRef<HTMLDivElement | null>(null);
  const eventsSectionRef = useRef<HTMLDivElement | null>(null);
  const lastKeyframeSaveSignatureRef = useRef<string | null>(null);
  const onAnimationsChangeRef = useRef(onAnimationsChange);
  const baseAnimations = useMemo(
    () => reindexAnimations(animations),
    [animations],
  );
  const editableAnimations = draftAnimations ?? baseAnimations;

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

  const selectedAnimationInfo = useMemo(
    () =>
      selectedAnimation === null
        ? null
        : editableAnimations[selectedAnimation] ?? null,
    [editableAnimations, selectedAnimation],
  );

  const availableBoneNames = useMemo(() => {
    if (!selectedAnimationInfo) {
      return [];
    }
    return extractBoneNames(selectedAnimationInfo.clip);
  }, [selectedAnimationInfo]);

  const selectedTrackConfig = TRACK_PROPERTY_CONFIG[selectedTrackProperty];
  const isTrackProperty = (value: string): value is TrackProperty =>
    value in TRACK_PROPERTY_CONFIG;

  const captureKeyframeSnapshot = useCallback((): KeyframeHistorySnapshot => {
    return {
      animations: editableAnimations.map((anim) => ({
        ...anim,
        clip: anim.clip.clone(),
      })),
      selectedAnimation,
      selectedBoneName,
      selectedTrackProperty,
      selectedKeyframeIndex,
      keyframeTimeInput,
      keyframeValueInputs: [...keyframeValueInputs],
      isCreatingKeyframe,
    };
  }, [
    editableAnimations,
    isCreatingKeyframe,
    keyframeTimeInput,
    keyframeValueInputs,
    selectedAnimation,
    selectedBoneName,
    selectedKeyframeIndex,
    selectedTrackProperty,
  ]);

  const makeKeyframeSignature = useCallback(
    (
      animationIndex: number | null,
      boneName: string,
      trackProperty: TrackProperty,
      keyframeIndex: number | null,
      timeInput: string,
      valueInputs: string[],
      creating: boolean,
    ) =>
      [
        animationIndex ?? "none",
        boneName,
        trackProperty,
        keyframeIndex ?? "new",
        creating ? "create" : "select",
        timeInput,
        ...valueInputs,
      ].join("|"),
    [],
  );

  const resetKeyframeHistory = useCallback(() => {
    keyframeHistoryLockRef.current = false;
    lastKeyframeSaveSignatureRef.current = null;
    setKeyframeUndoStack([]);
    setKeyframeRedoStack([]);
  }, []);

  const restoreKeyframeSnapshot = useCallback(
    (snapshot: KeyframeHistorySnapshot) => {
      keyframeHistoryLockRef.current = true;
      setDraftAnimations(snapshot.animations);
      setSelectedAnimation(snapshot.selectedAnimation);
      setSelectedBoneName(snapshot.selectedBoneName);
      setSelectedTrackProperty(snapshot.selectedTrackProperty);
      setSelectedKeyframeIndex(snapshot.selectedKeyframeIndex);
      setKeyframeTimeInput(snapshot.keyframeTimeInput);
      setKeyframeValueInputs(snapshot.keyframeValueInputs);
      setIsCreatingKeyframe(snapshot.isCreatingKeyframe);
      setKeyframeError(null);
      lastKeyframeSaveSignatureRef.current = makeKeyframeSignature(
        snapshot.selectedAnimation,
        snapshot.selectedBoneName,
        snapshot.selectedTrackProperty,
        snapshot.selectedKeyframeIndex,
        snapshot.keyframeTimeInput,
        snapshot.keyframeValueInputs,
        snapshot.isCreatingKeyframe,
      );
      window.setTimeout(() => {
        keyframeHistoryLockRef.current = false;
      }, 0);
    },
    [makeKeyframeSignature],
  );

  const handleUndoKeyframeChange = useCallback(() => {
    if (keyframeUndoStack.length === 0) {
      return;
    }
    const previous = keyframeUndoStack[keyframeUndoStack.length - 1];
    if (!previous) {
      return;
    }
    const current = captureKeyframeSnapshot();
    setKeyframeUndoStack((stack) => stack.slice(0, -1));
    setKeyframeRedoStack((stack) => [...stack, current]);
    restoreKeyframeSnapshot(previous);
  }, [captureKeyframeSnapshot, keyframeUndoStack, restoreKeyframeSnapshot]);

  const handleRedoKeyframeChange = useCallback(() => {
    if (keyframeRedoStack.length === 0) {
      return;
    }
    const next = keyframeRedoStack[keyframeRedoStack.length - 1];
    if (!next) {
      return;
    }
    const current = captureKeyframeSnapshot();
    setKeyframeRedoStack((stack) => stack.slice(0, -1));
    setKeyframeUndoStack((stack) => [...stack, current]);
    restoreKeyframeSnapshot(next);
  }, [captureKeyframeSnapshot, keyframeRedoStack, restoreKeyframeSnapshot]);

  const selectedTrack = useMemo(() => {
    if (!selectedAnimationInfo || !selectedBoneName) {
      return null;
    }
    return (
      selectedAnimationInfo.clip.tracks.find((track) => {
        const parsed = parseTrackName(track.name);
        if (!parsed) return false;
        return (
          parsed.boneName === selectedBoneName &&
          parsed.property === selectedTrackConfig.trackName
        );
      }) ?? null
    );
  }, [selectedAnimationInfo, selectedBoneName, selectedTrackConfig.trackName]);

  const selectedKeyframes = useMemo(() => {
    if (!selectedTrack) {
      return [];
    }
    const times = Array.from(selectedTrack.times);
    const values = Array.from(selectedTrack.values);
    const stride = selectedTrackConfig.components.length;
    return times.map((time, index) => ({
      time,
      values: values.slice(index * stride, index * stride + stride),
    }));
  }, [selectedTrack, selectedTrackConfig.components.length]);

  const timelineRows = useMemo(() => {
    if (!selectedAnimationInfo) {
      return [];
    }
    const rows = new Map<string, Set<number>>();
    selectedAnimationInfo.clip.tracks.forEach((track) => {
      const parsed = parseTrackName(track.name);
      if (!parsed) return;
      if (!rows.has(parsed.boneName)) {
        rows.set(parsed.boneName, new Set());
      }
      const rowTimes = rows.get(parsed.boneName);
      if (!rowTimes) return;
      Array.from(track.times).forEach((time) => rowTimes.add(time));
    });
    return Array.from(rows.entries()).map(([boneName, times]) => ({
      boneName,
      times: Array.from(times).sort((a, b) => a - b),
    }));
  }, [selectedAnimationInfo]);

  const totalKeyframes = useMemo(() => {
    if (!selectedAnimationInfo) {
      return 0;
    }
    return selectedAnimationInfo.clip.tracks.reduce(
      (sum, track) => sum + track.times.length,
      0,
    );
  }, [selectedAnimationInfo]);

  const selectedMetadata =
    selectedAnimationInfo && animationMetadata
      ? animationMetadata[selectedAnimationInfo.name]
      : undefined;

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
    const normalized = events
      .map((event) => ({
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

  useEffect(() => {
    onBoneSelectionChange?.(selectedBoneName || null);
  }, [selectedBoneName, onBoneSelectionChange]);

  const updateSelectedAnimation = useCallback((
    updater: (current: AnimationInfo) => AnimationInfo,
  ) => {
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
  }, [baseAnimations, selectedAnimation]);

  const scrollSectionIntoView = useCallback(
    (sectionRef: RefObject<HTMLDivElement | null>) => {
      sectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    },
    [],
  );

  const {
    isPlaying,
    currentTime,
    duration,
    hasActiveAction,
    currentActionRef,
    setPlayingState,
    setCurrentTime,
  } = useAnimationPlayback(
    animationMixer,
    selectedAnimation,
    editableAnimations,
    onAnimationChange,
  );

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
          entry.values.every(
            (value, offset) => value === parsedValues[offset],
          ),
      );
      const nextIndex =
        updatedIndex >= 0
          ? updatedIndex
          : selectedKeyframeIndex ?? combined.length - 1;
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
    keyframeTimeInput,
    keyframeValueInputs,
    makeKeyframeSignature,
    selectedAnimationInfo,
    selectedBoneName,
    selectedKeyframeIndex,
    selectedTrack,
    selectedTrackConfig.components.length,
    selectedTrackConfig.trackName,
    selectedTrackProperty,
    setCurrentTime,
    updateSelectedAnimation,
  ]);

  const handlePlay = () => {
    if (currentActionRef.current && animationMixer) {
      if (isPlaying) {
        currentActionRef.current.paused = true;
        setPlayingState(false);
      } else {
        currentActionRef.current.paused = false;
        currentActionRef.current.play();
        setPlayingState(true);
      }
    }
  };

  const handleStop = () => {
    if (currentActionRef.current) {
      currentActionRef.current.stop();
      syncAnimationActionTime(animationMixer, currentActionRef.current, 0);
      setCurrentTime(0);
      setPlayingState(false);
    }
  };

  const handleReset = () => {
    if (currentActionRef.current) {
      syncAnimationActionTime(animationMixer, currentActionRef.current, 0);
      setCurrentTime(0);
    }
  };

  const handleTimeChange = (newTime: number) => {
    const time = newTime;
    if (currentActionRef.current && animationMixer) {
      syncAnimationActionTime(animationMixer, currentActionRef.current, time);
      setCurrentTime(time);
    }
  };

  const handleUpdateAnimation = () => {
    if (selectedAnimation === null) return;
    const current = editableAnimations[selectedAnimation];
    if (!current) return;
    const trimmedName = editName.trim();
    const nextName =
      trimmedName.length > 0 ? trimmedName : `Animation ${selectedAnimation + 1}`;
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
  };

  const handleCreateAnimation = (sourceAnimationIndex: number | null) => {
    resetKeyframeHistory();
    const trimmedName = newAnimationName.trim();
    const nextAutoIndex = autoNameCounterRef.current;
    const nextName =
      trimmedName.length > 0
        ? trimmedName
        : `Animation ${nextAutoIndex}`;
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
        ? editableAnimations[sourceAnimationIndex]?.clip ?? null
        : null;
    const clip = sourceClip ? sourceClip.clone() : new AnimationClip(nextName, nextDuration, []);
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
  };

  const handleLoopModeChange = (mode: LoopMode) => {
    if (selectedAnimation === null || !selectedAnimationInfo) return;
    updateSelectedAnimation((anim) => ({
      ...anim,
      loop: mode !== "once",
      loopMode: mode,
    }));
  };

  const handleApplyDuration = () => {
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
  };

  const handleSelectKeyframe = useCallback((index: number) => {
    const keyframe = selectedKeyframes[index];
    if (!keyframe) return;
    if (selectedKeyframeIndex === index && !isCreatingKeyframe) {
      setSelectedKeyframeIndex(null);
      setIsCreatingKeyframe(false);
      setKeyframeTimeInput("");
      setKeyframeValueInputs([]);
      setKeyframeError(null);
      lastKeyframeSaveSignatureRef.current = null;
      return;
    }
    setIsCreatingKeyframe(false);
    setSelectedKeyframeIndex(index);
    setKeyframeTimeInput(keyframe.time.toString());
    setKeyframeValueInputs(keyframe.values.map((value) => value.toString()));
    setKeyframeError(null);
    lastKeyframeSaveSignatureRef.current = makeKeyframeSignature(
      selectedAnimationInfo?.index ?? null,
      selectedBoneName,
      selectedTrackProperty,
      index,
      keyframe.time.toString(),
      keyframe.values.map((value) => value.toString()),
      false,
    );
    if (currentActionRef.current) {
      currentActionRef.current.paused = true;
      syncAnimationActionTime(
        animationMixer,
        currentActionRef.current,
        keyframe.time,
      );
      setCurrentTime(keyframe.time);
      setPlayingState(false);
    }
  }, [
    animationMixer,
    currentActionRef,
    isCreatingKeyframe,
    makeKeyframeSignature,
    selectedAnimationInfo,
    selectedBoneName,
    selectedKeyframeIndex,
    selectedKeyframes,
    selectedTrackProperty,
    setCurrentTime,
    setPlayingState,
  ]);

  useEffect(() => {
    const pending = pendingTimelineSelectionRef.current;
    if (!pending || !selectedAnimationInfo || !selectedBoneName) {
      return;
    }
    if (
      pending.boneName !== selectedBoneName ||
      pending.property !== selectedTrackProperty
    ) {
      return;
    }

    const matchedIndex = selectedKeyframes.findIndex(
      (keyframe) =>
        Math.abs(keyframe.time - pending.time) < KEYFRAME_TIME_EPSILON,
    );
    if (matchedIndex < 0) {
      pendingTimelineSelectionRef.current = null;
      return;
    }

    pendingTimelineSelectionRef.current = null;
    handleSelectKeyframe(matchedIndex);
  }, [
    handleSelectKeyframe,
    selectedAnimationInfo,
    selectedBoneName,
    selectedKeyframes,
    selectedTrackProperty,
  ]);

  const handleUseBoneTransform = () => {
    if (!boneTransform || selectedTrackProperty !== "position") {
      return;
    }
    setKeyframeValueInputs(
      boneTransform.map((value) => value.toFixed(3)),
    );
    setKeyframeError(null);
  };

  const handleUseGizmoRotation = () => {
    if (!boneRotation || selectedTrackProperty !== "rotation") {
      return;
    }
    setKeyframeValueInputs(
      boneRotation.map((value) => value.toFixed(6)),
    );
    setKeyframeError(null);
  };

  const handleUseGizmoScale = () => {
    if (!boneScale || selectedTrackProperty !== "scale") {
      return;
    }
    setKeyframeValueInputs(
      boneScale.map((value) => value.toFixed(4)),
    );
    setKeyframeError(null);
  };

  const handleDeleteKeyframe = () => {
    if (
      !selectedAnimationInfo ||
      !selectedTrack ||
      selectedKeyframeIndex === null
    ) {
      return;
    }
    setKeyframeUndoStack((stack) => [...stack, captureKeyframeSnapshot()]);
    setKeyframeRedoStack([]);
    const stride = selectedTrackConfig.components.length;
    const times = Array.from(selectedTrack.times);
    const values = Array.from(selectedTrack.values);
    const nextTimes: number[] = [];
    const nextValues: number[] = [];
    times.forEach((time, index) => {
      if (index !== selectedKeyframeIndex) {
        nextTimes.push(time);
        nextValues.push(
          ...values.slice(index * stride, index * stride + stride),
        );
      }
    });
    const baseTracks = selectedAnimationInfo.clip.tracks.filter(
      (track) => track !== selectedTrack,
    );
    const nextTrack = selectedTrack.clone();
    nextTrack.times = new Float32Array(nextTimes);
    nextTrack.values = new Float32Array(nextValues);
    const nextTracks =
      nextTimes.length === 0
        ? baseTracks
        : [...baseTracks, nextTrack];
    const nextClip = new AnimationClip(
      selectedAnimationInfo.name,
      selectedAnimationInfo.duration,
      nextTracks,
    );
    updateSelectedAnimation((anim) => ({
      ...anim,
      clip: nextClip,
    }));
    setSelectedKeyframeIndex(null);
    setIsCreatingKeyframe(false);
    setKeyframeTimeInput("");
    setKeyframeValueInputs([]);
    setKeyframeError(null);
    lastKeyframeSaveSignatureRef.current = null;
  };

  const handleDeleteAnimation = () => {
    if (selectedAnimation === null) return;
    resetKeyframeHistory();
    const deletedIndex = selectedAnimation;
    setDraftEventsByAnimation((prev) => {
      return Object.fromEntries(
        Object.entries(prev).filter(([key]) => key !== String(deletedIndex)),
      );
    });
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
    setSelectedEventIndex(null);
    setKeyframeError(null);
    setDurationError(null);
  };

  const handleAnimationSelectionChange = (value: string) => {
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
      setSelectedEventIndex(null);
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
      const nextBoneName =
        extractBoneNames(resolvedAnimation.clip)[0] ?? "";
      setSelectedBoneName(nextBoneName);
      setSelectedTrackProperty("position");
      setSelectedKeyframeIndex(null);
      setIsCreatingKeyframe(false);
      setKeyframeTimeInput("");
      setKeyframeValueInputs([]);
      setSelectedEventIndex(null);
      setKeyframeError(null);
      setDurationError(null);
    }
  };

  const handleBoneNameChange = (boneName: string) => {
    setSelectedBoneName(boneName);
    setSelectedKeyframeIndex(null);
    setIsCreatingKeyframe(false);
    setKeyframeTimeInput("");
    setKeyframeValueInputs(
      Array(selectedTrackConfig.components.length).fill(""),
    );
    setKeyframeError(null);
    lastKeyframeSaveSignatureRef.current = null;
  };

  const handleTrackPropertyChange = (property: TrackProperty) => {
    setSelectedTrackProperty(property);
    setSelectedKeyframeIndex(null);
    setIsCreatingKeyframe(false);
    setKeyframeTimeInput("");
    setKeyframeValueInputs(
      Array(TRACK_PROPERTY_CONFIG[property].components.length).fill(""),
    );
    setKeyframeError(null);
    lastKeyframeSaveSignatureRef.current = null;
    // Auto-sync gizmo mode with track property
    if (onGizmoModeChange) {
      const modeMap: Record<TrackProperty, import("@/components/model-viewer/types").GizmoMode> = {
        position: "translate",
        rotation: "rotate",
        scale: "scale",
      };
      onGizmoModeChange(modeMap[property]);
    }
  };

  const handleNewKeyframe = () => {
    setIsCreatingKeyframe(true);
    setSelectedKeyframeIndex(null);
    setKeyframeTimeInput("");
    setKeyframeValueInputs(
      Array(selectedTrackConfig.components.length).fill(""),
    );
    setKeyframeError(null);
    lastKeyframeSaveSignatureRef.current = null;
  };

  const handleKeyframeValueInputChange = (index: number, value: string) => {
    setKeyframeValueInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleTimelineRowClick = (boneName: string, time: number) => {
    const matchingTrack =
      selectedAnimationInfo?.clip.tracks.find((track) => {
        const parsed = parseTrackName(track.name);
        if (!parsed || parsed.boneName !== boneName) {
          return false;
        }
        if (
          isTrackProperty(parsed.property) &&
          parsed.property === selectedTrackProperty
        ) {
          return Array.from(track.times).some(
            (trackTime) => Math.abs(trackTime - time) < KEYFRAME_TIME_EPSILON,
          );
        }
        return false;
      }) ??
      selectedAnimationInfo?.clip.tracks.find((track) => {
        const parsed = parseTrackName(track.name);
        if (!parsed || parsed.boneName !== boneName) {
          return false;
        }
        return Array.from(track.times).some(
          (trackTime) => Math.abs(trackTime - time) < KEYFRAME_TIME_EPSILON,
        );
      }) ??
      null;
    const matchingTrackProperty = matchingTrack
      ? parseTrackName(matchingTrack.name)
      : null;
    const nextTrackProperty: TrackProperty =
      matchingTrackProperty && isTrackProperty(matchingTrackProperty.property)
        ? matchingTrackProperty.property
        : selectedTrackProperty;

    pendingTimelineSelectionRef.current = {
      boneName,
      time,
      property: nextTrackProperty,
    };
    setSelectedBoneName(boneName);
    setSelectedTrackProperty(nextTrackProperty);
    setIsCreatingKeyframe(false);
    setSelectedKeyframeIndex(null);
    setKeyframeTimeInput("");
    setKeyframeValueInputs(
      Array(TRACK_PROPERTY_CONFIG[nextTrackProperty].components.length).fill(""),
    );
    setKeyframeError(null);
    lastKeyframeSaveSignatureRef.current = null;
    scrollSectionIntoView(editKeyframesSectionRef);
  };

  const handleSelectEvent = (index: number) => {
    const event = selectedEvents[index];
    if (!event) {
      return;
    }
    setSelectedEventIndex(index);
  };

  const handleTimelineEventClick = (index: number) => {
    handleSelectEvent(index);
    scrollSectionIntoView(eventsSectionRef);
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
    const nextEvents = selectedEvents.filter((_, currentIndex) => currentIndex !== index);
    const nextIndex =
      nextEvents.length === 0
        ? null
        : Math.min(index, nextEvents.length - 1);
    commitSelectedEvents(nextEvents, nextIndex);
  };

  const handleApplyEditorChanges = () => {
    handleUpdateAnimation();
    handleApplyDuration();
  };

  return (
    <Card className="flex min-h-0 flex-col overflow-hidden bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white text-sm">
          Animations ({editableAnimations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        <AnimationSelector
          selectedAnimation={selectedAnimation}
          editableAnimations={editableAnimations}
          onSelectionChange={handleAnimationSelectionChange}
        />

        <AnimationCreator
          editableAnimations={editableAnimations}
          newAnimationName={newAnimationName}
          newAnimationDurationInput={newAnimationDurationInput}
          onNameChange={setNewAnimationName}
          onDurationChange={setNewAnimationDurationInput}
          onCreate={handleCreateAnimation}
        />

        <div className="space-y-3 border-t border-gray-700 pt-3">
          <div className="text-xs font-semibold text-gray-300">
            Edit Animation Properties
          </div>
          <AnimationEditor
            selectedAnimationInfo={selectedAnimationInfo}
            editName={editName}
            editDurationInput={editDurationInput}
            durationMode={durationMode}
            durationError={durationError}
            onNameChange={setEditName}
            onDurationInputChange={setEditDurationInput}
            onLoopModeChange={handleLoopModeChange}
            onDurationModeChange={setDurationMode}
            onApplyChanges={handleApplyEditorChanges}
            onDeleteAnimation={handleDeleteAnimation}
          />
        </div>

        <div className="space-y-3 border-t border-gray-700 pt-3">
          <div className="text-xs font-semibold text-gray-300">
            Animation Timeline
          </div>
          <KeyframeEditor
            selectedAnimationInfo={selectedAnimationInfo}
            hasActiveAction={hasActiveAction}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            selectedBoneName={selectedBoneName}
            availableBoneNames={availableBoneNames}
            selectedTrackProperty={selectedTrackProperty}
            selectedKeyframes={selectedKeyframes}
            selectedKeyframeIndex={selectedKeyframeIndex}
            selectedEvents={selectedEvents}
            selectedEventIndex={selectedEventIndex}
            keyframeTimeInput={keyframeTimeInput}
            keyframeValueInputs={keyframeValueInputs}
            keyframeError={keyframeError}
            timelineRows={timelineRows}
            boneTransform={boneTransform ?? null}
            boneRotation={boneRotation ?? null}
            boneScale={boneScale ?? null}
            gameLabel={gameLabel}
            modelSourceKind={modelSourceKind}
            isCreatingKeyframe={isCreatingKeyframe}
            canUndo={keyframeUndoStack.length > 0}
            canRedo={keyframeRedoStack.length > 0}
            onBoneNameChange={handleBoneNameChange}
            onTrackPropertyChange={handleTrackPropertyChange}
            onSelectKeyframe={handleSelectKeyframe}
            onNewKeyframe={handleNewKeyframe}
            onTimeInputChange={setKeyframeTimeInput}
            onValueInputChange={handleKeyframeValueInputChange}
            onUseBoneTransform={handleUseBoneTransform}
            onUseGizmoRotation={handleUseGizmoRotation}
            onUseGizmoScale={handleUseGizmoScale}
            onDeleteKeyframe={handleDeleteKeyframe}
            onTimelineRowClick={handleTimelineRowClick}
            onTimelineEventClick={handleTimelineEventClick}
            editKeyframesSectionRef={editKeyframesSectionRef}
            onUndo={handleUndoKeyframeChange}
            onRedo={handleRedoKeyframeChange}
            onPlay={handlePlay}
            onPause={handlePlay}
            onStop={handleStop}
            onReset={handleReset}
            onSeek={handleTimeChange}
          />
        </div>

        <div
          ref={eventsSectionRef}
          className="space-y-3 border-t border-gray-700 pt-3"
        >
          <div className="text-xs font-semibold text-gray-300">
            Animation Events
          </div>
          <AnimationEventEditor
            selectedAnimationInfo={selectedAnimationInfo}
            selectedEvents={selectedEvents}
            selectedEventIndex={selectedEventIndex}
            gameLabel={gameLabel}
            modelSourceKind={modelSourceKind}
            onSelectEvent={handleSelectEvent}
            onAddEvent={handleNewEvent}
            onUpdateEvent={handleUpdateEvent}
            onDeleteEvent={handleDeleteEvent}
          />
        </div>

        <div className="space-y-3 border-t border-gray-700 pt-3">
          <div className="text-xs font-semibold text-gray-300">
            Animation Metadata
          </div>
          <AnimationMetadataDisplay
            selectedAnimationInfo={selectedAnimationInfo}
            selectedMetadata={selectedMetadata ?? null}
            timelineRows={timelineRows}
            totalKeyframes={totalKeyframes}
          />
        </div>

      </CardContent>
    </Card>
  );
}
