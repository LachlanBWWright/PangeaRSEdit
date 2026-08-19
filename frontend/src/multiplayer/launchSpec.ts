import {
  CROMAG_TRACKS,
  type CroMagTrackInfo,
} from "@/editor/utils/croMagLevelNumbers";
import {
  NANOSAUR2_LEVELS,
  type Nanosaur2LevelInfo,
} from "@/editor/utils/nanosaur2LevelNumbers";
import {
  GAME_PORT_CONFIGS,
  getLevelIndex,
  type AnyLevelInfo,
  type GamePortConfig,
} from "@/editor/utils/gamePortConfig";
import { Game } from "@/data/globals/globals";
import type { MultiplayerMatchConfig } from "@/multiplayer/types";

export interface MultiplayerLaunchSpec {
  readonly config: GamePortConfig;
  readonly levelNumber: number;
  readonly currentLevelInfo: AnyLevelInfo | undefined;
}

function normalizeLevelKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseLevelNumber(value: string): number | null {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function resolveCroMagTrackNumber(trackOrLevel: string): number {
  const parsed = parseLevelNumber(trackOrLevel);
  if (parsed !== null) {
    return parsed;
  }

  const normalizedInput = normalizeLevelKey(trackOrLevel);
  const explicitAliases: Readonly<Record<string, number>> = {
    iceramp: 17,
    ramp: 17,
    ramps: 17,
    tarpits: 15,
    stonehenge: 10,
  };
  const aliased = explicitAliases[normalizedInput];
  if (aliased !== undefined) {
    return aliased;
  }

  const matchedTrack = CROMAG_TRACKS.find((track: CroMagTrackInfo) => {
    const terrainBase = track.terrainFile.replace(/\.ter$/i, "");
    const vfsBase = track.vfsTerrainFile.replace(/\.ter$/i, "");
    const keys = [
      String(track.trackNumber),
      normalizeLevelKey(track.name),
      normalizeLevelKey(terrainBase),
      normalizeLevelKey(vfsBase),
    ];
    return keys.includes(normalizedInput);
  });

  return matchedTrack?.trackNumber ?? 1;
}

function resolveNanosaur2LevelNumber(trackOrLevel: string): number {
  const parsed = parseLevelNumber(trackOrLevel);
  if (parsed !== null) {
    return parsed;
  }

  const normalizedInput = normalizeLevelKey(trackOrLevel);
  const matchedLevel = NANOSAUR2_LEVELS.find((level: Nanosaur2LevelInfo) => {
    const terrainBase = level.terrainFile.replace(/\.ter$/i, "");
    const keys = [
      String(level.levelNumber),
      normalizeLevelKey(level.name),
      normalizeLevelKey(terrainBase),
    ];
    return keys.includes(normalizedInput);
  });

  return matchedLevel?.levelNumber ?? 0;
}

export function resolveMultiplayerLaunchSpec(
  matchConfig: MultiplayerMatchConfig,
): MultiplayerLaunchSpec | null {
  return resolveMultiplayerLaunchSpecFromSelection(
    matchConfig.gameId,
    matchConfig.trackOrLevel,
  );
}

export function resolveMultiplayerLaunchSpecFromSelection(
  gameId: string,
  trackOrLevel: string,
): MultiplayerLaunchSpec | null {
  if (gameId === "cromagrally") {
    const config = GAME_PORT_CONFIGS[Game.CRO_MAG];
    const levelNumber = resolveCroMagTrackNumber(trackOrLevel);
    const currentLevelInfo = config.levels.find(
      (levelInfo) => getLevelIndex(levelInfo) === levelNumber,
    );
    return {
      config,
      levelNumber,
      currentLevelInfo,
    };
  }

  if (gameId === "nanosaur2") {
    const config = GAME_PORT_CONFIGS[Game.NANOSAUR_2];
    const levelNumber = resolveNanosaur2LevelNumber(trackOrLevel);
    const currentLevelInfo = config.levels.find(
      (levelInfo) => getLevelIndex(levelInfo) === levelNumber,
    );
    return {
      config,
      levelNumber,
      currentLevelInfo,
    };
  }

  return null;
}
