import { useCallback, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AnimationInfo } from "./types";
import type { TrackProperty } from "./utils";

export interface KeyframeHistorySnapshot {
  animations: AnimationInfo[];
  selectedAnimation: number | null;
  selectedBoneName: string;
  selectedTrackProperty: TrackProperty;
  selectedKeyframeIndex: number | null;
  keyframeTimeInput: string;
  keyframeValueInputs: string[];
  isCreatingKeyframe: boolean;
}

interface UseKeyframeHistoryParams {
  editableAnimations: AnimationInfo[];
  selectedAnimation: number | null;
  selectedBoneName: string;
  selectedTrackProperty: TrackProperty;
  selectedKeyframeIndex: number | null;
  keyframeTimeInput: string;
  keyframeValueInputs: string[];
  isCreatingKeyframe: boolean;
  setDraftAnimations: Dispatch<SetStateAction<AnimationInfo[] | null>>;
  setSelectedAnimation: Dispatch<SetStateAction<number | null>>;
  setSelectedBoneName: Dispatch<SetStateAction<string>>;
  setSelectedTrackProperty: Dispatch<SetStateAction<TrackProperty>>;
  setSelectedKeyframeIndex: Dispatch<SetStateAction<number | null>>;
  setKeyframeTimeInput: Dispatch<SetStateAction<string>>;
  setKeyframeValueInputs: Dispatch<SetStateAction<string[]>>;
  setIsCreatingKeyframe: Dispatch<SetStateAction<boolean>>;
  setKeyframeError: Dispatch<SetStateAction<string | null>>;
}

export function useKeyframeHistory({
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
}: UseKeyframeHistoryParams) {
  const [keyframeUndoStack, setKeyframeUndoStack] = useState<
    KeyframeHistorySnapshot[]
  >([]);
  const [keyframeRedoStack, setKeyframeRedoStack] = useState<
    KeyframeHistorySnapshot[]
  >([]);

  const keyframeHistoryLockRef = useRef(false);
  const lastKeyframeSaveSignatureRef = useRef<string | null>(null);

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
    [
      makeKeyframeSignature,
      setDraftAnimations,
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

  return {
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
  };
}
