import {
  useCallback,
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import { AnimationClip } from "three";
import type { AnimationAction, AnimationMixer, KeyframeTrack } from "three";
import { syncAnimationActionTime } from "./hooks";
import type { AnimationInfo, Keyframe } from "./types";
import type { KeyframeHistorySnapshot } from "./useKeyframeHistory";
import {
  KEYFRAME_TIME_EPSILON,
  parseTrackName,
  TRACK_PROPERTY_CONFIG,
  type TrackProperty,
} from "./utils";

interface UseAnimationKeyframeControlsParams {
  animationMixer: AnimationMixer | null;
  selectedAnimationInfo: AnimationInfo | null;
  selectedTrack: KeyframeTrack | null;
  selectedKeyframes: Keyframe[];
  selectedTrackConfig: {
    trackName: string;
    components: string[];
  };
  selectedTrackProperty: TrackProperty;
  selectedBoneName: string;
  selectedKeyframeIndex: number | null;
  isCreatingKeyframe: boolean;
  boneTransform: [number, number, number] | null;
  boneRotation: [number, number, number, number] | null;
  boneScale: [number, number, number] | null;
  currentActionRef: MutableRefObject<AnimationAction | null>;
  pendingTimelineSelectionRef: MutableRefObject<{
    boneName: string;
    time: number;
    property: TrackProperty;
  } | null>;
  editKeyframesSectionRef: RefObject<HTMLDivElement | null>;
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
  setSelectedTrackProperty: Dispatch<SetStateAction<TrackProperty>>;
  setSelectedBoneName: Dispatch<SetStateAction<string>>;
  setSelectedKeyframeIndex: Dispatch<SetStateAction<number | null>>;
  setIsCreatingKeyframe: Dispatch<SetStateAction<boolean>>;
  setKeyframeTimeInput: Dispatch<SetStateAction<string>>;
  setKeyframeValueInputs: Dispatch<SetStateAction<string[]>>;
  setKeyframeError: Dispatch<SetStateAction<string | null>>;
  setCurrentTime: Dispatch<SetStateAction<number>>;
  setPlayingState: (value: boolean) => void;
  onGizmoModeChange?: (
    mode: import("@/components/model-viewer/types").GizmoMode,
  ) => void;
}

export function useAnimationKeyframeControls({
  animationMixer,
  selectedAnimationInfo,
  selectedTrack,
  selectedKeyframes,
  selectedTrackConfig,
  selectedTrackProperty,
  selectedBoneName,
  selectedKeyframeIndex,
  isCreatingKeyframe,
  boneTransform,
  boneRotation,
  boneScale,
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
}: UseAnimationKeyframeControlsParams) {
  const isTrackProperty = useCallback(
    (value: string): value is TrackProperty => value in TRACK_PROPERTY_CONFIG,
    [],
  );

  const handleSelectKeyframe = useCallback(
    (index: number) => {
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
    },
    [
      animationMixer,
      currentActionRef,
      isCreatingKeyframe,
      lastKeyframeSaveSignatureRef,
      makeKeyframeSignature,
      selectedAnimationInfo,
      selectedBoneName,
      selectedKeyframeIndex,
      selectedKeyframes,
      selectedTrackProperty,
      setCurrentTime,
      setIsCreatingKeyframe,
      setKeyframeError,
      setKeyframeTimeInput,
      setKeyframeValueInputs,
      setPlayingState,
      setSelectedKeyframeIndex,
    ],
  );

  useEffect(() => {
    const pending = pendingTimelineSelectionRef.current;
    if (!pending || !selectedAnimationInfo || !selectedBoneName) return;
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
    pendingTimelineSelectionRef,
    selectedAnimationInfo,
    selectedBoneName,
    selectedKeyframes,
    selectedTrackProperty,
  ]);

  const handleUseBoneTransform = useCallback(() => {
    if (!boneTransform || selectedTrackProperty !== "position") return;
    setKeyframeValueInputs(boneTransform.map((value) => value.toFixed(3)));
    setKeyframeError(null);
  }, [
    boneTransform,
    selectedTrackProperty,
    setKeyframeError,
    setKeyframeValueInputs,
  ]);

  const handleUseGizmoRotation = useCallback(() => {
    if (!boneRotation || selectedTrackProperty !== "rotation") return;
    setKeyframeValueInputs(boneRotation.map((value) => value.toFixed(6)));
    setKeyframeError(null);
  }, [
    boneRotation,
    selectedTrackProperty,
    setKeyframeError,
    setKeyframeValueInputs,
  ]);

  const handleUseGizmoScale = useCallback(() => {
    if (!boneScale || selectedTrackProperty !== "scale") return;
    setKeyframeValueInputs(boneScale.map((value) => value.toFixed(4)));
    setKeyframeError(null);
  }, [
    boneScale,
    selectedTrackProperty,
    setKeyframeError,
    setKeyframeValueInputs,
  ]);

  const handleDeleteKeyframe = useCallback(() => {
    if (
      !selectedAnimationInfo ||
      !selectedTrack ||
      selectedKeyframeIndex === null
    )
      return;

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
      nextTimes.length === 0 ? baseTracks : [...baseTracks, nextTrack];
    const nextClip = new AnimationClip(
      selectedAnimationInfo.name,
      selectedAnimationInfo.duration,
      nextTracks,
    );

    updateSelectedAnimation((anim) => ({ ...anim, clip: nextClip }));
    setSelectedKeyframeIndex(null);
    setIsCreatingKeyframe(false);
    setKeyframeTimeInput("");
    setKeyframeValueInputs([]);
    setKeyframeError(null);
    lastKeyframeSaveSignatureRef.current = null;
  }, [
    captureKeyframeSnapshot,
    lastKeyframeSaveSignatureRef,
    selectedAnimationInfo,
    selectedKeyframeIndex,
    selectedTrack,
    selectedTrackConfig.components.length,
    setIsCreatingKeyframe,
    setKeyframeError,
    setKeyframeRedoStack,
    setKeyframeTimeInput,
    setKeyframeUndoStack,
    setKeyframeValueInputs,
    setSelectedKeyframeIndex,
    updateSelectedAnimation,
  ]);

  const handleBoneNameChange = useCallback(
    (boneName: string) => {
      setSelectedBoneName(boneName);
      setSelectedKeyframeIndex(null);
      setIsCreatingKeyframe(false);
      setKeyframeTimeInput("");
      setKeyframeValueInputs(
        Array(selectedTrackConfig.components.length).fill(""),
      );
      setKeyframeError(null);
      lastKeyframeSaveSignatureRef.current = null;
    },
    [
      lastKeyframeSaveSignatureRef,
      selectedTrackConfig.components.length,
      setIsCreatingKeyframe,
      setKeyframeError,
      setKeyframeTimeInput,
      setKeyframeValueInputs,
      setSelectedBoneName,
      setSelectedKeyframeIndex,
    ],
  );

  const handleTrackPropertyChange = useCallback(
    (property: TrackProperty) => {
      setSelectedTrackProperty(property);
      setSelectedKeyframeIndex(null);
      setIsCreatingKeyframe(false);
      setKeyframeTimeInput("");
      setKeyframeValueInputs(
        Array(TRACK_PROPERTY_CONFIG[property].components.length).fill(""),
      );
      setKeyframeError(null);
      lastKeyframeSaveSignatureRef.current = null;
      if (onGizmoModeChange) {
        const modeMap: Record<
          TrackProperty,
          import("@/components/model-viewer/types").GizmoMode
        > = {
          position: "translate",
          rotation: "rotate",
          scale: "scale",
        };
        onGizmoModeChange(modeMap[property]);
      }
    },
    [
      lastKeyframeSaveSignatureRef,
      onGizmoModeChange,
      setIsCreatingKeyframe,
      setKeyframeError,
      setKeyframeTimeInput,
      setKeyframeValueInputs,
      setSelectedKeyframeIndex,
      setSelectedTrackProperty,
    ],
  );

  const handleNewKeyframe = useCallback(() => {
    setIsCreatingKeyframe(true);
    setSelectedKeyframeIndex(null);
    setKeyframeTimeInput("");
    setKeyframeValueInputs(
      Array(selectedTrackConfig.components.length).fill(""),
    );
    setKeyframeError(null);
    lastKeyframeSaveSignatureRef.current = null;
  }, [
    lastKeyframeSaveSignatureRef,
    selectedTrackConfig.components.length,
    setIsCreatingKeyframe,
    setKeyframeError,
    setKeyframeTimeInput,
    setKeyframeValueInputs,
    setSelectedKeyframeIndex,
  ]);

  const handleKeyframeValueInputChange = useCallback(
    (index: number, value: string) => {
      setKeyframeValueInputs((prev) => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
    },
    [setKeyframeValueInputs],
  );

  const handleTimelineRowClick = useCallback(
    (boneName: string, time: number) => {
      const matchingTrack =
        selectedAnimationInfo?.clip.tracks.find((track) => {
          const parsed = parseTrackName(track.name);
          if (!parsed || parsed.boneName !== boneName) return false;
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
          if (!parsed || parsed.boneName !== boneName) return false;
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
        Array(TRACK_PROPERTY_CONFIG[nextTrackProperty].components.length).fill(
          "",
        ),
      );
      setKeyframeError(null);
      lastKeyframeSaveSignatureRef.current = null;
      editKeyframesSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    },
    [
      editKeyframesSectionRef,
      isTrackProperty,
      lastKeyframeSaveSignatureRef,
      pendingTimelineSelectionRef,
      selectedAnimationInfo,
      selectedTrackProperty,
      setIsCreatingKeyframe,
      setKeyframeError,
      setKeyframeTimeInput,
      setKeyframeValueInputs,
      setSelectedBoneName,
      setSelectedKeyframeIndex,
      setSelectedTrackProperty,
    ],
  );

  return {
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
  };
}
