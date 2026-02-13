/**
 * AnimationViewer - Main component for viewing and editing animations
 * Refactored into smaller, maintainable sub-components
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AnimationClip,
  QuaternionKeyframeTrack,
  VectorKeyframeTrack,
} from "three";
import { AnimationSelector } from "./AnimationSelector";
import { AnimationControls } from "./AnimationControls";
import { AnimationEditor } from "./AnimationEditor";
import { KeyframeEditor } from "./KeyframeEditor";
import { AnimationMetadataDisplay } from "./AnimationMetadataDisplay";
import { AnimationCreator } from "./AnimationCreator";
import { useAnimationPlayback, reindexAnimations } from "./hooks";
import type { AnimationInfo, AnimationViewerProps } from "./types";
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

export function AnimationViewer({
  animations,
  animationMixer,
  onAnimationChange,
  onBoneSelectionChange,
  animationMetadata,
  boneTransform,
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
  const [keyframeTimeInput, setKeyframeTimeInput] = useState("");
  const [keyframeValueInputs, setKeyframeValueInputs] = useState<string[]>([]);
  const autoNameCounterRef = useRef(animations.length + 1);
  const baseAnimations = useMemo(
    () => reindexAnimations(animations),
    [animations],
  );
  const editableAnimations = draftAnimations ?? baseAnimations;

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

  useEffect(() => {
    onBoneSelectionChange?.(selectedBoneName || null);
  }, [selectedBoneName, onBoneSelectionChange]);

  const updateSelectedAnimation = (
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
  };

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
      currentActionRef.current.time = 0;
      setCurrentTime(0);
      setPlayingState(false);
    }
  };

  const handleReset = () => {
    if (currentActionRef.current) {
      currentActionRef.current.time = 0;
      setCurrentTime(0);
    }
  };

  const handleTimeChange = (newTime: number[]) => {
    const time = newTime[0] ?? 0;
    if (currentActionRef.current && animationMixer) {
      currentActionRef.current.time = time;
      setCurrentTime(time);
      animationMixer.update(0);
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

  const handleCreateAnimation = (fromSelection: boolean) => {
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
    const clip =
      fromSelection && selectedAnimationInfo?.clip
        ? selectedAnimationInfo.clip.clone()
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
  };

  const handleLoopToggle = () => {
    if (selectedAnimation === null || !selectedAnimationInfo) return;
    const nextLoop = !(selectedAnimationInfo.loop ?? true);
    updateSelectedAnimation((anim) => ({
      ...anim,
      loop: nextLoop,
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

  const handleSelectKeyframe = (index: number) => {
    const keyframe = selectedKeyframes[index];
    if (!keyframe) return;
    setSelectedKeyframeIndex(index);
    setKeyframeTimeInput(keyframe.time.toString());
    setKeyframeValueInputs(keyframe.values.map((value) => value.toString()));
    setKeyframeError(null);
    if (currentActionRef.current) {
      currentActionRef.current.time = keyframe.time;
      currentActionRef.current.paused = true;
      setCurrentTime(keyframe.time);
      setPlayingState(false);
    }
  };

  const handleApplyKeyframe = () => {
    if (!selectedAnimationInfo || !selectedBoneName) return;
    const timeValue = Number.parseFloat(keyframeTimeInput);
    if (!Number.isFinite(timeValue) || timeValue < 0) {
      setKeyframeError("Enter a valid keyframe time.");
      return;
    }
    const componentCount = selectedTrackConfig.components.length;
    if (keyframeValueInputs.length !== componentCount) {
      setKeyframeError("Enter all component values.");
      return;
    }
    const parsedValues = keyframeValueInputs.map((value) =>
      Number.parseFloat(value),
    );
    if (parsedValues.some((value) => !Number.isFinite(value))) {
      setKeyframeError("Enter valid numeric values.");
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
        currentActionRef.current.time = selectedEntry.time;
        setCurrentTime(selectedEntry.time);
      }
    }
    setKeyframeError(null);
  };

  const handleUseBoneTransform = () => {
    if (!boneTransform || selectedTrackProperty !== "position") {
      return;
    }
    setKeyframeValueInputs(
      boneTransform.map((value) => value.toFixed(3)),
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
    const nextTracks =
      nextTimes.length === 0
        ? baseTracks
        : [
            ...baseTracks,
            (() => {
              const nextTrack = selectedTrack.clone();
              nextTrack.times = new Float32Array(nextTimes);
              nextTrack.values = new Float32Array(nextValues);
              return nextTrack;
            })(),
          ];
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
    setKeyframeTimeInput("");
    setKeyframeValueInputs([]);
    setKeyframeError(null);
  };

  const handleDeleteAnimation = () => {
    if (selectedAnimation === null) return;
    const deletedIndex = selectedAnimation;
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
    setKeyframeTimeInput("");
    setKeyframeValueInputs([]);
    setKeyframeError(null);
    setDurationError(null);
  };

  const handleAnimationSelectionChange = (value: string) => {
    if (value === "none") {
      setSelectedAnimation(null);
      setEditName("");
      setEditDurationInput("");
      setSelectedBoneName("");
      setSelectedTrackProperty("position");
      setSelectedKeyframeIndex(null);
      setKeyframeTimeInput("");
      setKeyframeValueInputs([]);
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
      setEditName(resolvedAnimation.name);
      setEditDurationInput(resolvedAnimation.duration.toString());
      const nextBoneName =
        extractBoneNames(resolvedAnimation.clip)[0] ?? "";
      setSelectedBoneName(nextBoneName);
      setSelectedTrackProperty("position");
      setSelectedKeyframeIndex(null);
      setKeyframeTimeInput("");
      setKeyframeValueInputs([]);
      setKeyframeError(null);
      setDurationError(null);
    }
  };

  const handleBoneNameChange = (boneName: string) => {
    setSelectedBoneName(boneName);
    setSelectedKeyframeIndex(null);
    setKeyframeTimeInput("");
    setKeyframeValueInputs(
      Array(selectedTrackConfig.components.length).fill(""),
    );
    setKeyframeError(null);
  };

  const handleTrackPropertyChange = (property: TrackProperty) => {
    setSelectedTrackProperty(property);
    setSelectedKeyframeIndex(null);
    setKeyframeTimeInput("");
    setKeyframeValueInputs(
      Array(TRACK_PROPERTY_CONFIG[property].components.length).fill(""),
    );
    setKeyframeError(null);
  };

  const handleNewKeyframe = () => {
    setSelectedKeyframeIndex(null);
    setKeyframeTimeInput("");
    setKeyframeValueInputs(
      Array(selectedTrackConfig.components.length).fill(""),
    );
    setKeyframeError(null);
  };

  const handleKeyframeValueInputChange = (index: number, value: string) => {
    setKeyframeValueInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleTimelineRowClick = (boneName: string) => {
    setSelectedBoneName(boneName);
    setSelectedTrackProperty("position");
    const timelineRow = timelineRows.find((row) => row.boneName === boneName);
    setSelectedKeyframeIndex((prev) => {
      if (!timelineRow || timelineRow.times.length === 0) {
        return null;
      }
      const nextIndex = prev ?? 0;
      return Math.min(nextIndex, timelineRow.times.length - 1);
    });
  };

  const handleApplyEditorChanges = () => {
    handleUpdateAnimation();
    handleApplyDuration();
  };

  const timelineDuration = selectedAnimationInfo?.duration ?? 0;
  const timelinePlayhead =
    timelineDuration > 0 ? (currentTime / timelineDuration) * 100 : 0;

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white text-sm">
          Animations ({editableAnimations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimationSelector
          selectedAnimation={selectedAnimation}
          editableAnimations={editableAnimations}
          onSelectionChange={handleAnimationSelectionChange}
        />

        {selectedAnimationInfo && (
          <AnimationControls
            hasActiveAction={hasActiveAction}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlay={handlePlay}
            onPause={handlePlay}
            onStop={handleStop}
            onReset={handleReset}
            onSeek={handleTimeChange}
          />
        )}

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
            onLoopToggle={handleLoopToggle}
            onDurationModeChange={setDurationMode}
            onApplyChanges={handleApplyEditorChanges}
            onDeleteAnimation={handleDeleteAnimation}
          />
        </div>

        <div className="space-y-3 border-t border-gray-700 pt-3">
          <div className="text-xs font-semibold text-gray-300">
            Edit Keyframes
          </div>
          <KeyframeEditor
            selectedAnimationInfo={selectedAnimationInfo}
            selectedBoneName={selectedBoneName}
            availableBoneNames={availableBoneNames}
            selectedTrackProperty={selectedTrackProperty}
            selectedKeyframes={selectedKeyframes}
            selectedKeyframeIndex={selectedKeyframeIndex}
            keyframeTimeInput={keyframeTimeInput}
            keyframeValueInputs={keyframeValueInputs}
            keyframeError={keyframeError}
            timelineDuration={timelineDuration}
            timelinePlayhead={timelinePlayhead}
            timelineRows={timelineRows}
            boneTransform={boneTransform}
            onBoneNameChange={handleBoneNameChange}
            onTrackPropertyChange={handleTrackPropertyChange}
            onSelectKeyframe={handleSelectKeyframe}
            onNewKeyframe={handleNewKeyframe}
            onTimeInputChange={setKeyframeTimeInput}
            onValueInputChange={handleKeyframeValueInputChange}
            onUseBoneTransform={handleUseBoneTransform}
            onApplyKeyframe={handleApplyKeyframe}
            onDeleteKeyframe={handleDeleteKeyframe}
            onTimelineRowClick={handleTimelineRowClick}
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

        <div className="space-y-3 border-t border-gray-700 pt-3">
          <div className="text-xs font-semibold text-gray-300">
            Create Animation
          </div>
          <AnimationCreator
            newAnimationName={newAnimationName}
            newAnimationDurationInput={newAnimationDurationInput}
            onNameChange={setNewAnimationName}
            onDurationChange={setNewAnimationDurationInput}
            onCreateWithTracks={() => handleCreateAnimation(true)}
            onCreateEmpty={() => handleCreateAnimation(false)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
