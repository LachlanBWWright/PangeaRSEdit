import { useMemo } from "react";
import type { AnimationMetadata, AnimationInfo } from "./types";
import type { TrackProperty } from "./utils";
import {
  extractBoneNames,
  parseTrackName,
  TRACK_PROPERTY_CONFIG,
} from "./utils";

interface UseAnimationDerivedDataParams {
  selectedAnimationInfo: AnimationInfo | null;
  selectedBoneName: string;
  selectedTrackProperty: TrackProperty;
  animationMetadata?: Record<string, AnimationMetadata>;
}

export function useAnimationDerivedData({
  selectedAnimationInfo,
  selectedBoneName,
  selectedTrackProperty,
  animationMetadata,
}: UseAnimationDerivedDataParams) {
  const selectedTrackConfig = TRACK_PROPERTY_CONFIG[selectedTrackProperty];

  const availableBoneNames = useMemo(() => {
    if (!selectedAnimationInfo) {
      return [];
    }
    return extractBoneNames(selectedAnimationInfo.clip);
  }, [selectedAnimationInfo]);

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

  return {
    selectedTrackConfig,
    availableBoneNames,
    selectedTrack,
    selectedKeyframes,
    timelineRows,
    totalKeyframes,
    selectedMetadata,
  };
}
