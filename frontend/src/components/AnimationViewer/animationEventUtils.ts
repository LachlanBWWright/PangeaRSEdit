export const MIN_HEX_BONE_NAME_LENGTH = 6;
export const MIN_ANIMATION_DURATION = 0.016;
export const FALLBACK_LOOP_VALUE = true;
export const KEYFRAME_TIME_EPSILON = 0.0001;
export const MIN_PLAYBACK_RATIO = 0.001;
export const DEFAULT_ANIMATION_DURATION = 1;
export const TICKS_PER_SECOND = 30;

export type ModelSourceKind = "bg3d" | "3dmf" | "glb" | "unknown";

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
    description:
      "Reserved in headers, but not handled by the checked runtimes.",
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
  "Bugdom 1": { 0: "Kick", 1: "Waterbug" },
  "Nanosaur 1": {
    0: "Crunch",
    1: "Footstep",
    2: "Dilo Attack",
    3: "Wing Flap",
    4: "Footstep",
  },
  "Cro-Mag Rally": { 0: "No sound" },
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
  "Nanosaur 2": { 0: "No sound" },
  "Billy Frontier": { 0: "Spurs", 1: "Walker Crash", 2: "Walker Footstep" },
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
  if (gameLabel === "Bugdom 1" || gameLabel === "Nanosaur 1") return 4;
  if (modelSourceKind === "3dmf") return 4;
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
  if (isFlagEventType(type)) return `Flag ${value}`;
  if (isPlaySoundEventType(type)) {
    if (gameLabel && SOUND_EVENT_LABELS_BY_GAME[gameLabel])
      return SOUND_EVENT_LABELS_BY_GAME[gameLabel][value] ?? `Sound ${value}`;
    if (modelSourceKind === "3dmf")
      return FIRST_GEN_SOUND_LABELS[value] ?? `Sound ${value}`;
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
  if (isFlagEventType(type))
    return `Flag slot ${value} of ${getAnimationEventFlagLimit(modelSourceKind, gameLabel)}`;
  if (isPlaySoundEventType(type)) {
    if (gameLabel && SOUND_EVENT_LABELS_BY_GAME[gameLabel])
      return `${gameLabel}: ${SOUND_EVENT_LABELS_BY_GAME[gameLabel][value] ?? `Sound ${value}`}`;
    if (modelSourceKind === "3dmf")
      return `First-gen 3DMF: ${FIRST_GEN_SOUND_LABELS[value] ?? `Sound ${value}`}`;
    return "Exact sound name depends on the loaded game model.";
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
    if (gameLabel && SOUND_EVENT_LABELS_BY_GAME[gameLabel])
      return Object.entries(SOUND_EVENT_LABELS_BY_GAME[gameLabel])
        .map(([value, label]) => ({ value, label: `${value}: ${label}` }))
        .sort((a, b) => Number(a.value) - Number(b.value));
    if (modelSourceKind === "3dmf")
      return Object.entries(FIRST_GEN_SOUND_LABELS)
        .map(([value, label]) => ({ value, label: `${value}: ${label}` }))
        .sort((a, b) => Number(a.value) - Number(b.value));
    return Object.entries(FALLBACK_LATER_SOUND_LABELS)
      .map(([value, label]) => ({ value, label: `${value}: ${label}` }))
      .sort((a, b) => Number(a.value) - Number(b.value));
  }
  return [];
};

export const formatAnimationEventType = (type: number) =>
  ANIMEVENT_TYPE_CONFIG[type]?.label ?? `Type ${type}`;

export const getAnimationEventTooltip = (type: number) => {
  const config = ANIMEVENT_TYPE_CONFIG[type];
  if (!config) return `ANIMEVENT ${type}`;
  return `${config.label}: ${config.description} Supported in: ${config.supportedGames.join(", ")}`;
};
