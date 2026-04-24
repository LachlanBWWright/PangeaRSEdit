import { useState, useEffect, useRef, useMemo } from "react";
import { AnimationViewerLayout } from "./AnimationViewerLayout";
import {
  useAnimationPlayback,
  reindexAnimations,
  syncAnimationActionTime,
} from "./hooks";
import type { AnimationInfo, AnimationViewerProps } from "./types";
import { type TrackProperty, DEFAULT_ANIMATION_DURATION } from "./utils";
import { useKeyframeHistory } from "./useKeyframeHistory";
import { useAnimationEvents } from "./useAnimationEvents";
import { useAnimationCrud } from "./useAnimationCrud";
import { useKeyframeAutoApply } from "./useKeyframeAutoApply";
import { useAnimationKeyframeControls } from "./useAnimationKeyframeControls";
import { useAnimationDerivedData } from "./useAnimationDerivedData";
import { useAnimationSynchronization } from "./useAnimationSynchronization";

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
  const [draftAnimations, setDraftAnimations] = useState<
    AnimationInfo[] | null
  >(null);
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
  const pendingTimelineSelectionRef = useRef<{
    boneName: string;
    time: number;
    property: TrackProperty;
  } | null>(null);
  const editKeyframesSectionRef = useRef<HTMLDivElement | null>(null);
  const eventsSectionRef = useRef<HTMLDivElement | null>(null);
  const baseAnimations = useMemo(
    () => reindexAnimations(animations),
    [animations],
  );
  const editableAnimations = draftAnimations ?? baseAnimations;

  const { autoNameCounterRef, updateSelectedAnimation } =
    useAnimationSynchronization({
      animations,
      onAnimationsChange,
      draftAnimations,
      baseAnimations,
      selectedAnimation,
      setDraftAnimations,
    });

  const selectedAnimationInfo = useMemo(
    () =>
      selectedAnimation === null
        ? null
        : (editableAnimations[selectedAnimation] ?? null),
    [editableAnimations, selectedAnimation],
  );

  const {
    selectedTrackConfig,
    availableBoneNames,
    selectedTrack,
    selectedKeyframes,
    timelineRows,
    totalKeyframes,
    selectedMetadata,
  } = useAnimationDerivedData({
    selectedAnimationInfo,
    selectedBoneName,
    selectedTrackProperty,
    animationMetadata,
  });

  const {
    keyframeUndoStack,
    keyframeRedoStack,
    setKeyframeUndoStack,
    setKeyframeRedoStack,
    keyframeHistoryLockRef,
    lastKeyframeSaveSignatureRef,
    captureKeyframeSnapshot,
    makeKeyframeSignature,
    resetKeyframeHistory,
    handleUndoKeyframeChange,
    handleRedoKeyframeChange,
  } = useKeyframeHistory({
    editableAnimations,
    selectedAnimation,
    selectedBoneName,
    selectedTrackProperty,
    selectedKeyframeIndex,
    keyframeTimeInput,
    keyframeValueInputs,
    isCreatingKeyframe,
    setDraftAnimations,
    setSelectedAnimation,
    setSelectedBoneName,
    setSelectedTrackProperty,
    setSelectedKeyframeIndex,
    setKeyframeTimeInput,
    setKeyframeValueInputs,
    setIsCreatingKeyframe,
    setKeyframeError,
  });

  useEffect(() => {
    onBoneSelectionChange?.(selectedBoneName || null);
  }, [selectedBoneName, onBoneSelectionChange]);

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

  const {
    selectedEvents,
    selectedEventIndex,
    handleSelectEvent,
    handleNewEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    clearSelection,
    dropAnimationEvents,
  } = useAnimationEvents({
    selectedAnimationInfo,
    selectedMetadata,
    currentTime,
    onAnimationEventsChange,
  });

  useKeyframeAutoApply({
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
  });

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

  const {
    handleCreateAnimation,
    handleLoopModeChange,
    handleDeleteAnimation,
    handleAnimationSelectionChange,
    handleApplyEditorChanges,
  } = useAnimationCrud({
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
    clearEventSelection: clearSelection,
    dropAnimationEvents: dropAnimationEvents,
  });

  const {
    handleSelectKeyframe,
    handleUseBoneTransform,
    handleUseGizmoRotation,
    handleUseGizmoScale,
    handleDeleteKeyframe,
    handleBoneNameChange,
    handleTrackPropertyChange,
    handleNewKeyframe,
    handleKeyframeValueInputChange,
    handleTimelineRowClick,
  } = useAnimationKeyframeControls({
    animationMixer,
    selectedAnimationInfo,
    selectedTrack,
    selectedKeyframes,
    selectedTrackConfig,
    selectedTrackProperty,
    selectedBoneName,
    selectedKeyframeIndex,
    isCreatingKeyframe,
    boneTransform: boneTransform ?? null,
    boneRotation: boneRotation ?? null,
    boneScale: boneScale ?? null,
    currentActionRef,
    pendingTimelineSelectionRef,
    editKeyframesSectionRef,
    lastKeyframeSaveSignatureRef,
    makeKeyframeSignature,
    captureKeyframeSnapshot,
    setKeyframeUndoStack,
    setKeyframeRedoStack,
    updateSelectedAnimation,
    setSelectedTrackProperty,
    setSelectedBoneName,
    setSelectedKeyframeIndex,
    setIsCreatingKeyframe,
    setKeyframeTimeInput,
    setKeyframeValueInputs,
    setKeyframeError,
    setCurrentTime,
    setPlayingState,
    onGizmoModeChange,
  });

  const handleTimelineEventClick = (index: number) => {
    handleSelectEvent(index);
    eventsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <AnimationViewerLayout
      editableAnimations={editableAnimations}
      selectedAnimation={selectedAnimation}
      selectedAnimationInfo={selectedAnimationInfo}
      newAnimationName={newAnimationName}
      newAnimationDurationInput={newAnimationDurationInput}
      editName={editName}
      editDurationInput={editDurationInput}
      durationMode={durationMode}
      durationError={durationError}
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
      totalKeyframes={totalKeyframes}
      selectedMetadata={selectedMetadata ?? null}
      eventsSectionRef={eventsSectionRef}
      editKeyframesSectionRef={editKeyframesSectionRef}
      onSelectionChange={handleAnimationSelectionChange}
      onNewAnimationNameChange={setNewAnimationName}
      onNewAnimationDurationChange={setNewAnimationDurationInput}
      onCreateAnimation={handleCreateAnimation}
      onEditNameChange={setEditName}
      onEditDurationChange={setEditDurationInput}
      onLoopModeChange={handleLoopModeChange}
      onDurationModeChange={setDurationMode}
      onApplyEditorChanges={handleApplyEditorChanges}
      onDeleteAnimation={handleDeleteAnimation}
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
      onUndo={handleUndoKeyframeChange}
      onRedo={handleRedoKeyframeChange}
      onPlay={handlePlay}
      onPause={handlePlay}
      onStop={handleStop}
      onReset={handleReset}
      onSeek={handleTimeChange}
      onSelectEvent={handleSelectEvent}
      onAddEvent={handleNewEvent}
      onUpdateEvent={handleUpdateEvent}
      onDeleteEvent={handleDeleteEvent}
    />
  );
}
