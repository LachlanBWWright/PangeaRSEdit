/**
 * Animation Viewer utility functions
 */

import { AnimationClip } from "three";
import {
  MIN_ANIMATION_DURATION,
  MIN_HEX_BONE_NAME_LENGTH,
} from "./animationEventUtils";

export {
  ANIMEVENT_TYPE_CONFIG,
  DEFAULT_ANIMATION_DURATION,
  FALLBACK_LOOP_VALUE,
  KEYFRAME_TIME_EPSILON,
  MIN_PLAYBACK_RATIO,
  TICKS_PER_SECOND,
  formatAnimationEventType,
  getAnimationEventDetails,
  getAnimationEventFlagLimit,
  getAnimationEventTooltip,
  getAnimationEventValueLabel,
  getAnimationEventValueOptions,
  isFlagEventType,
  isPlaySoundEventType,
} from "./animationEventUtils";
export type { ModelSourceKind } from "./animationEventUtils";

export type TrackProperty = "position" | "rotation" | "scale";

export const TRACK_PROPERTY_CONFIG: Record<
  TrackProperty,
  { trackName: string; label: string; components: string[] }
> = {
  position: {
    trackName: "position",
    label: "Position",
    components: ["X", "Y", "Z"],
  },
  rotation: {
    trackName: "quaternion",
    label: "Rotation (Quaternion)",
    components: ["X", "Y", "Z", "W"],
  },
  scale: {
    trackName: "scale",
    label: "Scale",
    components: ["X", "Y", "Z"],
  },
};

export const parseTrackName = (name: string) => {
  const lastDot = name.lastIndexOf(".");
  if (lastDot === -1) {
    return null;
  }
  return {
    boneName: name.slice(0, lastDot),
    property: name.slice(lastDot + 1),
  };
};

/**
 * Decode hex-encoded bone names (Pascal-style length prefix or null-terminated).
 * Some skeletons store bone names in fixed-width hex strings; this tries the
 * length-prefixed format first, then falls back to null-terminated ASCII.
 */
export const decodeHexEncodedBoneName = (value: string) => {
  const normalized = value.replace(/\s+/g, "");
  if (
    normalized.length < MIN_HEX_BONE_NAME_LENGTH ||
    normalized.length % 2 !== 0 ||
    !/^[0-9a-fA-F]+$/.test(normalized)
  ) {
    return null;
  }
  const matches = normalized.match(/.{1,2}/g);
  if (!matches) {
    return null;
  }
  const bytes = matches.map((pair) => Number.parseInt(pair, 16));
  if (bytes.length === 0) {
    return null;
  }
  const firstByte = bytes[0];
  if (
    firstByte !== undefined &&
    firstByte > 0 &&
    1 + firstByte <= bytes.length
  ) {
    const length = firstByte;
    const slice = bytes.slice(1, 1 + length);
    const decoded = slice
      .map((byte) =>
        byte >= 32 && byte < 127 ? String.fromCharCode(byte) : "",
      )
      .join("");
    if (decoded.trim().length > 0) {
      return decoded.trim();
    }
  }
  let decoded = "";
  for (const byte of bytes) {
    if (byte === 0) break;
    if (byte >= 32 && byte < 127) {
      decoded += String.fromCharCode(byte);
    }
  }
  return decoded.trim().length > 0 ? decoded.trim() : null;
};

export const formatBoneLabel = (value: string) =>
  decodeHexEncodedBoneName(value) ?? value;

export const extractBoneNames = (clip: AnimationClip) => {
  const names = new Set<string>();
  clip.tracks.forEach((track) => {
    const parsed = parseTrackName(track.name);
    if (!parsed) return;
    const hasProperty = Object.values(TRACK_PROPERTY_CONFIG).some(
      (config) => config.trackName === parsed.property,
    );
    if (hasProperty) {
      names.add(parsed.boneName);
    }
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b));
};

export const parseDurationInputValue = (value: string, fallback: number) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < MIN_ANIMATION_DURATION) {
    return { value: fallback, valid: false };
  }
  return { value: parsed, valid: true };
};

export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, "0")}.${ms
    .toString()
    .padStart(2, "0")}`;
};

export const durationErrorMessage = `Invalid duration. Must be at least ${MIN_ANIMATION_DURATION} seconds.`;
