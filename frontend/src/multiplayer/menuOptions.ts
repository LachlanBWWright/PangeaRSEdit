import { CROMAG_TRACKS } from "@/editor/utils/croMagLevelNumbers";
import { NANOSAUR2_LEVELS } from "@/editor/utils/nanosaur2LevelNumbers";
import {
  CRO_MAG_MULTIPLAYER_MODES,
  NANOSAUR2_MULTIPLAYER_MODES,
  deriveLobbyModeFilterValue,
  formatMultiplayerModeLabel,
  usesCroMagBattleArenas,
  usesNanosaur2RaceLevels,
} from "./modes";
import type { MultiplayerLobbySummary } from "./types";

export interface LobbyFormState {
  readonly gameId: string;
  readonly mode: string;
  readonly trackOrLevel: string;
  readonly maxPlayers: number;
  readonly tagDurationMinutes: number;
  readonly displayName: string;
  readonly isPublic: boolean;
}

export type JoinGameFilter = "all" | "cromagrally" | "nanosaur2";
export type JoinModeFilter =
  | "all"
  | "race"
  | "battle"
  | "capture-the-flag";

export interface GameModeOption {
  readonly value: string;
  readonly label: string;
}

export interface LevelOption {
  readonly value: string;
  readonly label: string;
}

export const defaultLobbyFormState: LobbyFormState = {
  gameId: "cromagrally",
  mode: "multiplayerRace",
  trackOrLevel: "1",
  maxPlayers: 2,
  tagDurationMinutes: 3,
  displayName: "Player",
  isPublic: true,
};

export const CROMAG_TAG_DURATION_OPTIONS: readonly LevelOption[] = [
  { value: "2", label: "2 minutes" },
  { value: "3", label: "3 minutes" },
  { value: "4", label: "4 minutes" },
];

export function getMaxPlayerOptions(gameId: string): readonly number[] {
  return gameId === "nanosaur2" ? [2] : [2, 3, 4, 5, 6];
}

export const JOIN_GAME_FILTER_OPTIONS: readonly {
  readonly value: JoinGameFilter;
  readonly label: string;
}[] = [
  { value: "all", label: "All games" },
  { value: "cromagrally", label: "Cro-Mag Rally" },
  { value: "nanosaur2", label: "Nanosaur 2" },
];

export const JOIN_MODE_FILTER_OPTIONS: readonly {
  readonly value: JoinModeFilter;
  readonly label: string;
}[] = [
  { value: "all", label: "All modes" },
  { value: "race", label: "Race" },
  { value: "battle", label: "Battle / Survival / Tag" },
  { value: "capture-the-flag", label: "Capture the Flag" },
];

const CROMAG_RACE_OPTIONS: readonly LevelOption[] = CROMAG_TRACKS.filter(
  (track) => track.trackNumber <= 9,
).map((track) => ({ value: String(track.trackNumber), label: track.name }));

const CROMAG_BATTLE_OPTIONS: readonly LevelOption[] = CROMAG_TRACKS.filter(
  (track) => track.trackNumber >= 10,
).map((track) => ({ value: String(track.trackNumber), label: track.name }));

const CROMAG_MODE_OPTIONS: readonly GameModeOption[] = [
  ...CRO_MAG_MULTIPLAYER_MODES.map((mode) => ({
    value: mode,
    label: `${formatMultiplayerModeLabel(mode)} (${usesCroMagBattleArenas(mode) ? "arenas 10-17" : "tracks 1-9"})`,
  })),
];

const NANOSAUR2_MODE_OPTIONS: readonly GameModeOption[] =
  NANOSAUR2_MULTIPLAYER_MODES.map((mode) => ({
    value: mode,
    label: formatMultiplayerModeLabel(mode),
  }));

export function getModeOptions(gameId: string): readonly GameModeOption[] {
  if (gameId === "nanosaur2") {
    return NANOSAUR2_MODE_OPTIONS;
  }
  return CROMAG_MODE_OPTIONS;
}

function getNanosaur2BattleOptions(): readonly LevelOption[] {
  return NANOSAUR2_LEVELS.filter(
    (level) => level.levelNumber >= 5 && level.levelNumber <= 6,
  ).map((level) => ({ value: String(level.levelNumber), label: level.name }));
}

function getNanosaur2FlagOptions(): readonly LevelOption[] {
  return NANOSAUR2_LEVELS.filter((level) => level.levelNumber >= 7).map(
    (level) => ({
      value: String(level.levelNumber),
      label: level.name,
    }),
  );
}

function getNanosaur2RaceOptions(): readonly LevelOption[] {
  return NANOSAUR2_LEVELS.filter(
    (level) => level.levelNumber >= 3 && level.levelNumber <= 4,
  ).map((level) => ({ value: String(level.levelNumber), label: level.name }));
}

export function getTrackOptions(
  gameId: string,
  mode: string,
): readonly LevelOption[] {
  if (gameId === "nanosaur2") {
    if (usesNanosaur2RaceLevels(mode)) {
      return getNanosaur2RaceOptions();
    }
    if (mode === "multiplayerBattle") {
      return getNanosaur2BattleOptions();
    }
    if (mode === "multiplayerFlag") {
      return getNanosaur2FlagOptions();
    }
    return getNanosaur2BattleOptions();
  }
  if (usesCroMagBattleArenas(mode)) {
    return CROMAG_BATTLE_OPTIONS;
  }
  return CROMAG_RACE_OPTIONS;
}

export function defaultTrackForMode(gameId: string, mode: string): string {
  return getTrackOptions(gameId, mode)[0]?.value ?? "1";
}

export function usesCroMagTagDuration(gameId: string, mode: string): boolean {
  return (
    gameId === "cromagrally" &&
    (mode === "multiplayerTag1" || mode === "multiplayerTag2")
  );
}

export function toJoinGameFilter(value: string): JoinGameFilter {
  if (value === "cromagrally" || value === "nanosaur2") {
    return value;
  }
  return "all";
}

export function toJoinModeFilter(value: string): JoinModeFilter {
  if (value === "race" || value === "battle" || value === "capture-the-flag") {
    return value;
  }
  return "all";
}

function deriveLobbyModeFilter(mode: string): JoinModeFilter {
  return deriveLobbyModeFilterValue(mode);
}

export function filterPublicLobbies(
  lobbies: readonly MultiplayerLobbySummary[],
  gameFilter: JoinGameFilter,
  modeFilter: JoinModeFilter,
): readonly MultiplayerLobbySummary[] {
  return lobbies.filter((lobby) => {
    const gameMatches = gameFilter === "all" || lobby.gameId === gameFilter;
    const modeMatches =
      modeFilter === "all" || deriveLobbyModeFilter(lobby.mode) === modeFilter;
    return gameMatches && modeMatches;
  });
}

export function resolveDirectJoinLobbyId(
  value: string,
  lobbies: readonly MultiplayerLobbySummary[],
): string {
  const trimmedValue = value.trim();
  const normalizedJoinCode = trimmedValue.toUpperCase();
  const matchingLobby = lobbies.find(
    (lobby) => lobby.joinCode.toUpperCase() === normalizedJoinCode,
  );
  return matchingLobby?.id ?? trimmedValue;
}

export function getLevelOptionLabel(
  options: readonly LevelOption[],
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function buildUpdatedLobbyFormState(
  previousState: LobbyFormState,
  nextGameId: string,
): LobbyFormState {
  const nextMode = getModeOptions(nextGameId)[0]?.value ?? "multiplayerRace";
  return {
    ...previousState,
    gameId: nextGameId,
    mode: nextMode,
    trackOrLevel: defaultTrackForMode(nextGameId, nextMode),
    maxPlayers: getMaxPlayerOptions(nextGameId)[0] ?? 2,
  };
}

export function buildUpdatedLobbyModeState(
  previousState: LobbyFormState,
  nextMode: string,
): LobbyFormState {
  return {
    ...previousState,
    mode: nextMode,
    trackOrLevel: defaultTrackForMode(previousState.gameId, nextMode),
  };
}
