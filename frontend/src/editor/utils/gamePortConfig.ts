/**
 * Game port configurations for all 8 Pangea games.
 *
 * Each config describes how to load the WASM build, which levels/tracks exist,
 * and which game API functions are available for external control.
 */

import { Game } from "../../data/globals/globals";
import {
  OTTO_LEVELS,
  type OttoLevelInfo,
  inferLevelNumberFromFilename as inferOttoLevel,
} from "./ottoLevelNumbers";
import {
  NANOSAUR_LEVELS,
  type NanosaurLevelInfo,
  inferLevelNumberFromFilename as inferNanosaurLevel,
} from "./nanosaurLevelNumbers";
import {
  BUGDOM_LEVELS,
  type BugdomLevelInfo,
  inferLevelNumberFromFilename as inferBugdomLevel,
} from "./bugdomLevelNumbers";
import {
  BUGDOM2_LEVELS,
  type Bugdom2LevelInfo,
  inferLevelNumberFromFilename as inferBugdom2Level,
} from "./bugdom2LevelNumbers";
import {
  CROMAG_TRACKS,
  getCroMagVfsTerrainFile,
  type CroMagTrackInfo,
  inferLevelNumberFromFilename as inferCroMagLevel,
} from "./croMagLevelNumbers";
import {
  BILLY_FRONTIER_AREAS,
  type BillyFrontierAreaInfo,
  inferLevelNumberFromFilename as inferBillyLevel,
} from "./billyFrontierLevelNumbers";
import {
  MIGHTY_MIKE_LEVELS,
  type MightyMikeLevelInfo,
  inferLevelNumberFromFilename as inferMightyMikeLevel,
} from "./mightyMikeLevelNumbers";
import {
  NANOSAUR2_LEVELS,
  type Nanosaur2LevelInfo,
  inferLevelNumberFromFilename as inferNanosaur2Level,
} from "./nanosaur2LevelNumbers";

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
  /** Relative path to the direct WASM game shell within games/pangea-ports/. */
  readonly siteLaunchPath: string;
  /** Build the query string that skips directly to the selected level/track/area. */
  readonly buildLaunchQuery: (levelIndex: number) => URLSearchParams;
  /** Directory name under frontend/public/.generated/pangea-ports/wasm/ for local WASM files. */
  readonly wasmDir: string;
  /** Main JS filename produced by the Emscripten build (e.g. "OttoMatic.js"). */
  readonly mainJs: string;
  /** Preference folder name under /home/web_user/.config inside the browser FS. */
  readonly prefsFolderName: string;
  /** GitHub Pages URL for the game page (remote play fallback). */
  readonly remoteGameUrl: (levelIndex: number) => string;
  /** All available levels/tracks/areas. */
  readonly levels: readonly AnyLevelInfo[];
  readonly defaultLevel: number;
  /**
   * Window globals to set BEFORE loading the game script.
   * Used by games like Bugdom that read window.BUGDOM_START_LEVEL etc.
   */
  readonly getPreLoadVars?: (levelIndex: number) => Record<string, unknown>;
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
  // ----- Terrain injection -----
  readonly terrain?: {
    getRsrcPath?: (terrainFile: string) => string;
    getDataPath: (terrainFile: string) => string;
    /** ccall to set the active terrain path after writing to FS. Omit when not needed. */
    setPathFn?: string;
    getSetPathArg?: (terrainFile: string) => string;
  };
  /** Whether a WASM build is publicly available (false for MightyMike). */
  readonly wasmAvailable: boolean;
}

export function buildPangeaPortsUrl(
  baseUrl: string,
  config: GamePortConfig,
  levelIndex: number,
): string {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const url = new URL(config.siteLaunchPath, normalizedBaseUrl);
  url.search = config.buildLaunchQuery(levelIndex).toString();
  return url.toString();
}

/**
 * Infers the preview level index from the loaded file's name.
 * Returns `undefined` when the filename cannot be matched to a known level.
 */
export function inferPreviewLevelFromFilename(
  game: Game,
  filename: string,
): number | undefined {
  switch (game) {
    case Game.OTTO_MATIC:
      return inferOttoLevel(filename);
    case Game.NANOSAUR:
      return inferNanosaurLevel(filename);
    case Game.BUGDOM:
      return inferBugdomLevel(filename);
    case Game.BUGDOM_2:
      return inferBugdom2Level(filename);
    case Game.BILLY_FRONTIER:
      return inferBillyLevel(filename);
    case Game.NANOSAUR_2:
      return inferNanosaur2Level(filename);
    case Game.CRO_MAG:
      return inferCroMagLevel(filename);
    case Game.MIGHTY_MIKE:
      return inferMightyMikeLevel(filename);
    default:
      return undefined;
  }
}

export const GAME_PORT_CONFIGS: Readonly<Record<Game, GamePortConfig>> = {
  [Game.OTTO_MATIC]: {
    game: Game.OTTO_MATIC,
    siteLaunchPath: "OttoMatic-Android/OttoMatic.html",
    buildLaunchQuery: (n) =>
      new URLSearchParams({ level: String(n), embed: "1" }),
    wasmDir: "ottomatic",
    mainJs: "OttoMatic.js",
    prefsFolderName: "OttoMatic",
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
    siteLaunchPath: "Nanosaur-android/game/index.html",
    buildLaunchQuery: (n) =>
      new URLSearchParams({ level: String(n), skipMenu: "1", embed: "1" }),
    wasmDir: "nanosaur",
    mainJs: "Nanosaur.js",
    prefsFolderName: "Nanosaur",
    remoteGameUrl: () =>
      "https://lachlanbwwright.github.io/Nanosaur-android/game/index.html?level=0&skipMenu=1",
    levels: NANOSAUR_LEVELS,
    defaultLevel: 0,
    hasFenceCollision: true,
    hasGodMode: false,
    hasSpeedMultiplier: false,
    terrain: {
      getDataPath: (f) => `/Data/Terrain/${f}`,
      setPathFn: "SetCustomTerrainFile",
      getSetPathArg: (f) => `/Data/Terrain/${f}`,
    },
    wasmAvailable: true,
  },

  [Game.BUGDOM]: {
    game: Game.BUGDOM,
    siteLaunchPath: "Bugdom-android/game.html",
    buildLaunchQuery: (n) =>
      new URLSearchParams({ level: String(n), embed: "1" }),
    wasmDir: "bugdom",
    mainJs: "Bugdom.js",
    prefsFolderName: "Bugdom",
    remoteGameUrl: (n) =>
      `https://lachlanbwwright.github.io/Bugdom-android/game.html?level=${String(n)}`,
    levels: BUGDOM_LEVELS,
    defaultLevel: 0,
    getPreLoadVars: (n) => ({ BUGDOM_START_LEVEL: n }),
    hasFenceCollision: true,
    hasGodMode: false,
    hasSpeedMultiplier: false,
    terrain: {
      getRsrcPath: (f) => `/Data/Terrain/${f}.rsrc`,
      getDataPath: (f) => `/Data/Terrain/${f}`,
      setPathFn: "BugdomSetTerrainOverride",
      // BugdomSetTerrainOverride (and BUGDOM_TERRAIN_FILE) expect the data-fork path;
      // the game appends ".rsrc" itself to open the resource fork.
      getSetPathArg: (f) => `/Data/Terrain/${f}`,
    },
    wasmAvailable: true,
  },

  [Game.BUGDOM_2]: {
    game: Game.BUGDOM_2,
    siteLaunchPath: "Bugdom2-Android/Bugdom2.html",
    buildLaunchQuery: (n) =>
      new URLSearchParams({ level: String(n), embed: "1" }),
    wasmDir: "bugdom2",
    mainJs: "Bugdom2.js",
    prefsFolderName: "Bugdom2",
    remoteGameUrl: (n) =>
      `https://lachlanbwwright.github.io/Bugdom2-Android/Bugdom2.html?level=${String(n)}`,
    levels: BUGDOM2_LEVELS,
    defaultLevel: 0,
    hasFenceCollision: true,
    hasGodMode: false,
    hasSpeedMultiplier: false,
    terrain: {
      // Bugdom 2 VFS uses paths without a leading slash (relative to working dir)
      getRsrcPath: (f) => `Data/Terrain/${f}.rsrc`,
      getDataPath: (f) => `Data/Terrain/${f}`,
    },
    wasmAvailable: true,
  },

  [Game.CRO_MAG]: {
    game: Game.CRO_MAG,
    siteLaunchPath: "CroMagRally-Android/game/CroMagRally.html",
    buildLaunchQuery: (n) =>
      new URLSearchParams({ track: String(n), car: "1", embed: "1" }),
    wasmDir: "cromagrally",
    mainJs: "CroMagRally.js",
    prefsFolderName: "CroMagRally",
    remoteGameUrl: (n) =>
      `https://lachlanbwwright.github.io/CroMagRally-Android/game/CroMagRally.html?track=${String(n)}`,
    levels: CROMAG_TRACKS,
    defaultLevel: 1,
    hasFenceCollision: true,
    hasGodMode: false,
    hasSpeedMultiplier: false,
    terrain: {
      getRsrcPath: (f) => `/Data/Terrain/${getCroMagVfsTerrainFile(f)}.rsrc`,
      getDataPath: (f) => `/Data/Terrain/${getCroMagVfsTerrainFile(f)}`,
    },
    wasmAvailable: true,
  },

  [Game.BILLY_FRONTIER]: {
    game: Game.BILLY_FRONTIER,
    siteLaunchPath: "BillyFrontier-Android/game/billyfrontier.html",
    buildLaunchQuery: (n) =>
      new URLSearchParams({ level: String(n), embed: "1" }),
    wasmDir: "billyfrontier",
    mainJs: "billyfrontier.js",
    prefsFolderName: "BillyFrontier",
    remoteGameUrl: (n) =>
      `https://lachlanbwwright.github.io/BillyFrontier-Android/game/billyfrontier.html#level=${String(n)}`,
    levels: BILLY_FRONTIER_AREAS,
    defaultLevel: 0,
    getSkipToLevelCcall: undefined,
    hasFenceCollision: true,
    hasGodMode: false,
    hasSpeedMultiplier: false,
    terrain: {
      getRsrcPath: (f) => `Data/Terrain/${f}.rsrc`,
      getDataPath: (f) => `Data/Terrain/${f}`,
      setPathFn: "BF_SetTerrainFile",
      getSetPathArg: (f) => `:Terrain:${f}`,
    },
    wasmAvailable: true,
  },

  [Game.MIGHTY_MIKE]: {
    game: Game.MIGHTY_MIKE,
    siteLaunchPath: "MightyMike-Android/index.html",
    buildLaunchQuery: (n) =>
      new URLSearchParams({
        level: `${String(Math.floor(n / 3))}:${String(n % 3)}`,
        embed: "1",
      }),
    wasmDir: "mightymike",
    mainJs: "MightyMike.js",
    prefsFolderName: "MightyMike",
    remoteGameUrl: () =>
      "https://github.com/LachlanBWWright/MightyMike-Android",
    levels: MIGHTY_MIKE_LEVELS,
    defaultLevel: 0,
    hasFenceCollision: false,
    hasGodMode: false,
    hasSpeedMultiplier: false,
    terrain: {
      getDataPath: (f) => `/Data/Maps/${f}`,
      setPathFn: "Boot_SetCustomMapPath",
      getSetPathArg: (f) => `:Maps:${f}`,
    },
    wasmAvailable: true,
  },

  [Game.NANOSAUR_2]: {
    game: Game.NANOSAUR_2,
    siteLaunchPath: "Nanosaur2-Android/Nanosaur2.html",
    buildLaunchQuery: (n) =>
      new URLSearchParams({ level: String(n), embed: "1" }),
    wasmDir: "nanosaur2",
    mainJs: "Nanosaur2.js",
    prefsFolderName: "Nanosaur2",
    remoteGameUrl: (n) =>
      `https://lachlanbwwright.github.io/Nanosaur2-Android/?level=${String(n)}`,
    levels: NANOSAUR2_LEVELS,
    defaultLevel: 0,
    hasFenceCollision: true,
    hasGodMode: false,
    hasSpeedMultiplier: false,
    terrain: {
      getRsrcPath: (f) => `/Data/Terrain/${f}.rsrc`,
      getDataPath: (f) => `/Data/Terrain/${f}`,
      setPathFn: "Nanosaur2_SetTerrainOverridePath",
      getSetPathArg: (f) => `/Data/Terrain/${f}`,
    },
    wasmAvailable: true,
  },
};
