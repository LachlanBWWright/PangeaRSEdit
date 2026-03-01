/**
 * Game port configurations for all 8 Pangea games.
 *
 * Each config describes how to load the WASM build, which levels/tracks exist,
 * and which game API functions are available for external control.
 */

import { Game } from "../../data/globals/globals";
import { OTTO_LEVELS, type OttoLevelInfo } from "./ottoLevelNumbers";
import { NANOSAUR_LEVELS, type NanosaurLevelInfo } from "./nanosaurLevelNumbers";
import { BUGDOM_LEVELS, type BugdomLevelInfo } from "./bugdomLevelNumbers";
import { BUGDOM2_LEVELS, type Bugdom2LevelInfo } from "./bugdom2LevelNumbers";
import { CROMAG_TRACKS, type CroMagTrackInfo } from "./croMagLevelNumbers";
import { BILLY_FRONTIER_AREAS, type BillyFrontierAreaInfo } from "./billyFrontierLevelNumbers";
import { MIGHTY_MIKE_LEVELS, type MightyMikeLevelInfo } from "./mightyMikeLevelNumbers";
import { NANOSAUR2_LEVELS, type Nanosaur2LevelInfo } from "./nanosaur2LevelNumbers";

export type AnyLevelInfo =
  | OttoLevelInfo
  | NanosaurLevelInfo
  | BugdomLevelInfo
  | Bugdom2LevelInfo
  | CroMagTrackInfo
  | BillyFrontierAreaInfo
  | MightyMikeLevelInfo
  | Nanosaur2LevelInfo;

/** Returns the display name for any level/track/area info object. */
export function getLevelDisplayName(info: AnyLevelInfo): string {
  if ("terrainFile" in info && "levelNumber" in info) {
    return info.name;
  }
  if ("trackNumber" in info) {
    return info.name;
  }
  if ("areaNumber" in info) {
    return info.name;
  }
  return info.name;
}

/** Returns the level index (0-based internal index) for any level info. */
export function getLevelIndex(info: AnyLevelInfo): number {
  if ("trackNumber" in info) return info.trackNumber;
  if ("areaNumber" in info) return info.areaNumber;
  return info.levelNumber;
}

export interface GamePortConfig {
  readonly game: Game;
  /** Directory name under frontend/public/wasm/ for local WASM files. */
  readonly wasmDir: string;
  /** Main JS filename produced by the Emscripten build (e.g. "OttoMatic.js"). */
  readonly mainJs: string;
  /** GitHub Pages URL for the game page (remote play fallback). */
  readonly remoteGameUrl: (levelIndex: number) => string;
  /** All available levels/tracks/areas. */
  readonly levels: readonly AnyLevelInfo[];
  readonly defaultLevel: number;
  /**
   * Window globals to set BEFORE loading the game script.
   * Used by games like Bugdom that read window.BUGDOM_START_LEVEL etc.
   */
  readonly getPreLoadVars?: (
    levelIndex: number,
  ) => Record<string, unknown>;
  /**
   * After Module.onRuntimeInitialized fires, call this ccall to skip the
   * title screen / jump to a specific level.
   */
  readonly getSkipToLevelCcall?: (levelIndex: number) => {
    fn: string;
    returnType: null;
    argTypes: string[];
    args: unknown[];
  } | null;
  // ----- Controls -----
  readonly hasFenceCollision: boolean;
  readonly hasGodMode: boolean;
  readonly hasSpeedMultiplier: boolean;
  // ----- Terrain injection (for Otto Matic only in this version) -----
  readonly terrain?: {
    getRsrcPath?: (terrainFile: string) => string;
    getDataPath: (terrainFile: string) => string;
    /** ccall to set the active terrain path after writing to FS. */
    setPathFn: string;
    getSetPathArg: (terrainFile: string) => string;
  };
  /** Whether a WASM build is publicly available (false for MightyMike). */
  readonly wasmAvailable: boolean;
}

export const GAME_PORT_CONFIGS: Readonly<Record<Game, GamePortConfig>> = {
  [Game.OTTO_MATIC]: {
    game: Game.OTTO_MATIC,
    wasmDir: "ottomatic",
    mainJs: "OttoMatic.js",
    remoteGameUrl: (n) =>
      `https://lachlanbwwright.github.io/OttoMatic-Android/?level=${String(n)}`,
    levels: OTTO_LEVELS,
    defaultLevel: 0,
    getSkipToLevelCcall: (n) => ({
      fn: "OttoMatic_SkipToLevel",
      returnType: null,
      argTypes: ["number"],
      args: [n],
    }),
    hasFenceCollision: true,
    hasGodMode: true,
    hasSpeedMultiplier: true,
    terrain: {
      getRsrcPath: (f) => `/Data/Terrain/${f}.rsrc`,
      getDataPath: (f) => `/Data/Terrain/${f}`,
      setPathFn: "OttoMatic_SetTerrainPath",
      getSetPathArg: (f) => `/Data/Terrain/${f}`,
    },
    wasmAvailable: true,
  },

  [Game.NANOSAUR]: {
    game: Game.NANOSAUR,
    wasmDir: "nanosaur",
    mainJs: "Nanosaur.js",
    remoteGameUrl: () =>
      "https://lachlanbwwright.github.io/Nanosaur-android/game/index.html?level=0&skipMenu=1",
    levels: NANOSAUR_LEVELS,
    defaultLevel: 0,
    hasFenceCollision: true,
    hasGodMode: false,
    hasSpeedMultiplier: false,
    wasmAvailable: true,
  },

  [Game.BUGDOM]: {
    game: Game.BUGDOM,
    wasmDir: "bugdom",
    mainJs: "Bugdom.js",
    remoteGameUrl: (n) =>
      `https://lachlanbwwright.github.io/Bugdom-android/game.html?level=${String(n)}`,
    levels: BUGDOM_LEVELS,
    defaultLevel: 0,
    getPreLoadVars: (n) => ({ BUGDOM_START_LEVEL: n }),
    hasFenceCollision: true,
    hasGodMode: false,
    hasSpeedMultiplier: false,
    wasmAvailable: true,
  },

  [Game.BUGDOM_2]: {
    game: Game.BUGDOM_2,
    wasmDir: "bugdom2",
    mainJs: "Bugdom2.js",
    remoteGameUrl: (n) =>
      `https://lachlanbwwright.github.io/Bugdom2-Android/Bugdom2.html?level=${String(n)}`,
    levels: BUGDOM2_LEVELS,
    defaultLevel: 0,
    hasFenceCollision: true,
    hasGodMode: false,
    hasSpeedMultiplier: false,
    wasmAvailable: true,
  },

  [Game.CRO_MAG]: {
    game: Game.CRO_MAG,
    wasmDir: "cromagrally",
    mainJs: "CroMagRally.js",
    remoteGameUrl: (n) =>
      `https://lachlanbwwright.github.io/CroMagRally-Android/game/CroMagRally.html?track=${String(n)}`,
    levels: CROMAG_TRACKS,
    defaultLevel: 1,
    hasFenceCollision: true,
    hasGodMode: false,
    hasSpeedMultiplier: false,
    wasmAvailable: true,
  },

  [Game.BILLY_FRONTIER]: {
    game: Game.BILLY_FRONTIER,
    wasmDir: "billyfrontier",
    mainJs: "BillyFrontier.js",
    remoteGameUrl: (n) =>
      `https://lachlanbwwright.github.io/BillyFrontier-Android/game/billyfrontier.html#level=${String(n)}`,
    levels: BILLY_FRONTIER_AREAS,
    defaultLevel: 0,
    getSkipToLevelCcall: (n) => ({
      fn: "BF_SetDirectLaunchLevel",
      returnType: null,
      argTypes: ["number"],
      args: [n],
    }),
    hasFenceCollision: true,
    hasGodMode: false,
    hasSpeedMultiplier: false,
    terrain: {
      getDataPath: (f) => `Data/Terrain/${f}`,
      setPathFn: "BF_SetTerrainFile",
      getSetPathArg: (f) => `:Terrain:${f}`,
    },
    wasmAvailable: true,
  },

  [Game.MIGHTY_MIKE]: {
    game: Game.MIGHTY_MIKE,
    wasmDir: "mightymike",
    mainJs: "MightyMike.js",
    remoteGameUrl: () =>
      "https://github.com/LachlanBWWright/MightyMike-Android",
    levels: MIGHTY_MIKE_LEVELS,
    defaultLevel: 0,
    hasFenceCollision: false,
    hasGodMode: false,
    hasSpeedMultiplier: false,
    wasmAvailable: false,
  },

  [Game.NANOSAUR_2]: {
    game: Game.NANOSAUR_2,
    wasmDir: "nanosaur2",
    mainJs: "Nanosaur2.js",
    remoteGameUrl: (n) =>
      `https://lachlanbwwright.github.io/Nanosaur2-Android/?level=${String(n)}`,
    levels: NANOSAUR2_LEVELS,
    defaultLevel: 0,
    hasFenceCollision: true,
    hasGodMode: false,
    hasSpeedMultiplier: false,
    wasmAvailable: true,
  },
};
