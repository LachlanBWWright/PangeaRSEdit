/**
 * Animation Viewer utility functions
 */

import { AnimationClip } from "three";

export const MIN_HEX_BONE_NAME_LENGTH = 6;
export const MIN_ANIMATION_DURATION = 0.016; // ~1 frame at 60fps
export const FALLBACK_LOOP_VALUE = true;
export const KEYFRAME_TIME_EPSILON = 0.0001;
export const MIN_PLAYBACK_RATIO = 0.001;
export const DEFAULT_ANIMATION_DURATION = 1;
export const TICKS_PER_SECOND = 30;

export type ModelSourceKind = "bg3d" | "3dmf" | "glb" | "unknown";

export type TrackProperty = "position" | "rotation" | "scale";

export const ANIMEVENT_TYPE_CONFIG: Record<
  number,
  { label: string; description: string; supportedGames: string[] }
> = {
  0: {
    label: "Stop",
    description: "Stop the animation.",
    supportedGames: [
      "Bugdom",
      "Nanosaur",
      "Cro-Mag Rally",
      "Otto Matic",
      "Bugdom 2",
      "Nanosaur 2",
      "Billy Frontier",
    ],
  },
  1: {
    label: "Loop",
    description: "Loop back to the start.",
    supportedGames: [
      "Bugdom",
      "Nanosaur",
      "Cro-Mag Rally",
      "Otto Matic",
      "Bugdom 2",
      "Nanosaur 2",
      "Billy Frontier",
    ],
  },
  2: {
    label: "Zigzag",
    description: "Play forward, then backward.",
    supportedGames: [
      "Bugdom",
      "Nanosaur",
      "Cro-Mag Rally",
      "Otto Matic",
      "Bugdom 2",
      "Nanosaur 2",
      "Billy Frontier",
    ],
  },
  3: {
    label: "Go to Marker",
    description: "Reserved in headers, but not handled by the checked runtimes.",
    supportedGames: [
      "Bugdom",
      "Nanosaur",
      "Cro-Mag Rally",
      "Otto Matic",
      "Bugdom 2",
      "Nanosaur 2",
      "Billy Frontier",
    ],
  },
  4: {
    label: "Set Marker",
    description: "Stores the current time as the loopback marker.",
    supportedGames: [
      "Bugdom",
      "Nanosaur",
      "Cro-Mag Rally",
      "Otto Matic",
      "Bugdom 2",
      "Nanosaur 2",
      "Billy Frontier",
    ],
  },
  5: {
    label: "Play Sound",
    description: "Trigger a game-specific sound effect.",
    supportedGames: [
      "Bugdom",
      "Nanosaur",
      "Cro-Mag Rally",
      "Otto Matic",
      "Bugdom 2",
      "Nanosaur 2",
      "Billy Frontier",
    ],
  },
  6: {
    label: "Set Flag",
    description: "Set one of the animation-addressable ObjNode flags.",
    supportedGames: [
      "Bugdom",
      "Nanosaur",
      "Cro-Mag Rally",
      "Otto Matic",
      "Bugdom 2",
      "Nanosaur 2",
      "Billy Frontier",
    ],
  },
  7: {
    label: "Clear Flag",
    description: "Clear one of the animation-addressable ObjNode flags.",
    supportedGames: [
      "Bugdom",
      "Nanosaur",
      "Cro-Mag Rally",
      "Otto Matic",
      "Bugdom 2",
      "Nanosaur 2",
      "Billy Frontier",
    ],
  },
  8: {
    label: "Pause",
    description: "Pause for a number of 30 Hz ticks.",
    supportedGames: ["Otto Matic", "Bugdom 2", "Nanosaur 2", "Billy Frontier"],
  },
};

const SOUND_EVENT_LABELS_BY_GAME: Record<string, Record<number, string>> = {
  "Bugdom 1": {
    0: "Kick",
    1: "Waterbug",
  },
  "Nanosaur 1": {
    0: "Crunch",
    1: "Footstep",
    2: "Dilo Attack",
    3: "Wing Flap",
    4: "Footstep",
  },
  "Cro-Mag Rally": {
    0: "No sound",
  },
  "Otto Matic": {
    0: "Onion Swoosh",
    3: "Footstep",
    4: "Footstep",
    5: "Pitcher Puke",
    6: "Flytrap",
  },
  "Bugdom 2": {
    0: "Gnome Step",
    1: "Gnome Step",
    2: "Tick Step",
    3: "Stomp",
    4: "Servo",
    5: "Servo",
    6: "Ant Bite",
    7: "Snap Trap",
    8: "Otto Fall",
    9: "Footstep",
  },
  "Nanosaur 2": {
    0: "No sound",
  },
  "Billy Frontier": {
    0: "Spurs",
    1: "Walker Crash",
    2: "Walker Footstep",
  },
};

const FIRST_GEN_SOUND_LABELS: Record<number, string> = {
  0: "Bugdom 1: Kick / Nanosaur 1: Crunch",
  1: "Bugdom 1: Waterbug / Nanosaur 1: Footstep",
  2: "Nanosaur 1: Dilo Attack",
  3: "Nanosaur 1: Wing Flap",
  4: "Nanosaur 1: Footstep / Stego Footstep",
};

const FALLBACK_LATER_SOUND_LABELS: Record<number, string> = {
  0: "Sound 0",
  1: "Sound 1",
  2: "Sound 2",
  3: "Sound 3",
  4: "Sound 4",
  5: "Sound 5",
  6: "Sound 6",
  7: "Sound 7",
  8: "Sound 8",
  9: "Sound 9",
};

export const getAnimationEventFlagLimit = (
  modelSourceKind: ModelSourceKind | null | undefined,
  gameLabel: string | null | undefined,
) => {
  if (gameLabel === "Bugdom 1" || gameLabel === "Nanosaur 1") {
    return 4;
  }
  if (modelSourceKind === "3dmf") {
    return 4;
  }
  return 5;
};

export const isFlagEventType = (type: number) => type === 6 || type === 7;

export const isPlaySoundEventType = (type: number) => type === 5;

export const getAnimationEventValueLabel = (
  type: number,
  value: number,
  modelSourceKind?: ModelSourceKind | null,
  gameLabel?: string | null,
) => {
  if (isFlagEventType(type)) {
    const flagLimit = getAnimationEventFlagLimit(modelSourceKind, gameLabel);
    if (Number.isInteger(value) && value >= 0 && value < flagLimit) {
      return `Flag ${value}`;
    }
    return `Flag ${value}`;
  }

  if (isPlaySoundEventType(type)) {
    if (gameLabel && SOUND_EVENT_LABELS_BY_GAME[gameLabel]) {
      return SOUND_EVENT_LABELS_BY_GAME[gameLabel][value] ?? `Sound ${value}`;
    }
    if (modelSourceKind === "3dmf") {
      return FIRST_GEN_SOUND_LABELS[value] ?? `Sound ${value}`;
    }
    return FALLBACK_LATER_SOUND_LABELS[value] ?? `Sound ${value}`;
  }

  return `${value}`;
};

export const getAnimationEventDetails = (
  type: number,
  value: number,
  modelSourceKind?: ModelSourceKind | null,
  gameLabel?: string | null,
) => {
  if (isFlagEventType(type)) {
    const flagLimit = getAnimationEventFlagLimit(modelSourceKind, gameLabel);
    return `Flag slot ${value} of ${flagLimit}`;
  }

  if (isPlaySoundEventType(type)) {
    if (gameLabel && SOUND_EVENT_LABELS_BY_GAME[gameLabel]) {
      return `${gameLabel}: ${
        SOUND_EVENT_LABELS_BY_GAME[gameLabel][value] ?? `Sound ${value}`
      }`;
    }
    if (modelSourceKind === "3dmf") {
      return `First-gen 3DMF: ${
        FIRST_GEN_SOUND_LABELS[value] ?? `Sound ${value}`
      }`;
    }
    return `Exact sound name depends on the loaded game model.`;
  }

  return null;
};

export const getAnimationEventValueOptions = (
  type: number,
  modelSourceKind?: ModelSourceKind | null,
  gameLabel?: string | null,
) => {
  if (isFlagEventType(type)) {
    const limit = getAnimationEventFlagLimit(modelSourceKind, gameLabel);
    return Array.from({ length: limit }, (_value, index) => ({
      value: String(index),
      label: `Flag ${index}`,
    }));
  }

  if (isPlaySoundEventType(type)) {
    if (gameLabel && SOUND_EVENT_LABELS_BY_GAME[gameLabel]) {
      return Object.entries(SOUND_EVENT_LABELS_BY_GAME[gameLabel])
        .map(([value, label]) => ({
          value,
          label: `${value}: ${label}`,
        }))
        .sort((a, b) => Number(a.value) - Number(b.value));
    }
    if (modelSourceKind === "3dmf") {
      return Object.entries(FIRST_GEN_SOUND_LABELS)
        .map(([value, label]) => ({
          value,
          label: `${value}: ${label}`,
        }))
        .sort((a, b) => Number(a.value) - Number(b.value));
    }
    return Object.entries(FALLBACK_LATER_SOUND_LABELS)
      .map(([value, label]) => ({
        value,
        label: `${value}: ${label}`,
      }))
      .sort((a, b) => Number(a.value) - Number(b.value));
  }

  return [];
};

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
      .map((byte) => (byte >= 32 && byte < 127 ? String.fromCharCode(byte) : ""))
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

export const formatAnimationEventType = (type: number) =>
  ANIMEVENT_TYPE_CONFIG[type]?.label ?? `Type ${type}`;

export const getAnimationEventTooltip = (type: number) => {
  const config = ANIMEVENT_TYPE_CONFIG[type];
  if (!config) {
    return `ANIMEVENT ${type}`;
  }
  return `${config.label}: ${config.description} Supported in: ${config.supportedGames.join(", ")}`;
};
