import { Game } from "../../data/globals/globals";
import type { AnyLevelInfo, GamePortConfig } from "./gamePortConfig";

export const GAME_DISPLAY_NAMES: Readonly<Record<Game, string>> = {
  [Game.OTTO_MATIC]: "Otto Matic",
  [Game.NANOSAUR]: "Nanosaur",
  [Game.BUGDOM]: "Bugdom",
  [Game.BUGDOM_2]: "Bugdom 2",
  [Game.CRO_MAG]: "Cro-Mag Rally",
  [Game.BILLY_FRONTIER]: "Billy Frontier",
  [Game.MIGHTY_MIKE]: "Mighty Mike",
  [Game.NANOSAUR_2]: "Nanosaur 2",
};

export interface PreviewTerrainPaths {
  readonly dataPath: string;
  readonly rsrcPath: string | null;
  readonly texturePath?: string;
  /**
   * Additional data-fork path to write the same bytes to.
   * Used for MightyMike where the WASM may look for either lowercase or
   * capitalized terrain filenames on the case-sensitive Emscripten VFS.
   */
  readonly altDataPath?: string;
}

export interface PreviewRuntimeModule {
  canvas: HTMLCanvasElement;
  arguments: string[];
  preInit?: (() => void)[];
  preRun: (() => void)[];
  postRun?: (() => void)[];
  locateFile: (path: string) => string;
  webglContextAttributes?: {
    powerPreference?: string;
    antialias?: boolean;
    preserveDrawingBuffer?: boolean;
  };
  setStatus?: (text: string) => void;
  monitorRunDependencies?: (left: number) => void;
  onRuntimeInitialized?: () => void;
  onAbort?: (reason: unknown) => void;
  FS?: {
    writeFile: (path: string, data: Uint8Array) => void;
    analyzePath?: (path: string) => { exists: boolean };
    mkdir?: (path: string) => void;
  };
  /** Removes a file from the VFS. Exposed by all Emscripten builds including those that don't expose Module.FS. */
  FS_unlink?: (path: string) => void;
  /** Creates a data file in the VFS. Used as a fallback write mechanism when Module.FS is absent. */
  FS_createDataFile?: (
    parent: string,
    name: string,
    data: Uint8Array,
    canRead: boolean,
    canWrite: boolean,
    canOwn: boolean,
  ) => void;
  FS_createPath?: (
    parent: string,
    path: string,
    canRead: boolean,
    canWrite: boolean,
  ) => void;
  ccall?: (
    ident: string,
    returnType: string | null,
    argTypes: string[],
    args: unknown[],
  ) => unknown;
  calledRun?: boolean;
}

declare global {
  interface Window {
    Module?: PreviewRuntimeModule;
    SetCustomTerrainFile?: (path: string) => unknown;
  }
}

export class PreviewRuntimeLoadError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "PreviewRuntimeLoadError";
    this.status = status;
  }
}

export function levelLabel(info: AnyLevelInfo, idx: number): string {
  if ("trackNumber" in info) {
    return `Track ${String(info.trackNumber)}: ${info.name}`;
  }
  if ("areaNumber" in info) {
    return `Area ${String(info.areaNumber + 1)}: ${info.name}`;
  }
  return `Lv ${String(idx + 1)}: ${info.name}`;
}

export function buildGameArguments(
  config: GamePortConfig,
  levelNumber: number,
  terrainPath: string | null,
  normalLaunch = false,
): string[] {
  if (normalLaunch) return [];
  switch (config.game) {
    case Game.OTTO_MATIC:
      return terrainPath
        ? ["--level", String(levelNumber), "--terrain", terrainPath]
        : ["--level", String(levelNumber)];
    case Game.NANOSAUR:
      return ["--level", String(levelNumber), "--skip-menu"];
    case Game.BUGDOM:
      return [];
    case Game.BUGDOM_2:
      return ["--level", String(levelNumber)];
    case Game.CRO_MAG:
      return ["--track", String(levelNumber), "--car", "1"];
    case Game.BILLY_FRONTIER:
      return [];
    case Game.MIGHTY_MIKE: {
      const levelArg = `${String(Math.floor(levelNumber / 3))}:${String(levelNumber % 3)}`;
      if (!terrainPath) {
        return ["--level", levelArg];
      }
      return [
        "--level",
        levelArg,
        "--map-override",
        `:Maps:${terrainPath.split("/").pop() ?? terrainPath}`,
      ];
    }
    case Game.NANOSAUR_2:
      return ["--level", String(levelNumber)];
    default:
      return [];
  }
}

export function getPreviewTerrainPaths(
  info: AnyLevelInfo | undefined,
  config: GamePortConfig,
): PreviewTerrainPaths | null {
  if (config.game === Game.NANOSAUR) {
    return {
      dataPath: "/Data/Terrain/Level1.ter",
      rsrcPath: null,
      texturePath: "/Data/Terrain/Level1.trt",
    };
  }
  if (!info || !("terrainFile" in info)) {
    return null;
  }
  const dataPath = config.terrain?.getDataPath
    ? config.terrain.getDataPath(info.terrainFile)
    : `/Data/Terrain/${info.terrainFile}`;
  const rsrcPath = config.terrain?.getRsrcPath
    ? config.terrain.getRsrcPath(info.terrainFile)
    : null;

  if (config.game === Game.MIGHTY_MIKE) {
    const filename = info.terrainFile;
    const lastSlash = dataPath.lastIndexOf("/");
    const dataPathDir = lastSlash >= 0 ? dataPath.slice(0, lastSlash) : "";
    const capitalizedFilename =
      filename.charAt(0).toUpperCase() + filename.slice(1);
    const lowercaseFilename =
      filename.charAt(0).toLowerCase() + filename.slice(1);
    const alternateFilename =
      filename === capitalizedFilename
        ? lowercaseFilename
        : capitalizedFilename;
    const alternatePath = `${dataPathDir}/${alternateFilename}`;
    const altDataPath = alternatePath !== dataPath ? alternatePath : undefined;
    return { dataPath, rsrcPath, altDataPath };
  }

  return { dataPath, rsrcPath };
}

export function buildPreviewAssetBaseUrls(config: GamePortConfig): string[] {
  const appBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin)
    .href;
  const generatedBase = new URL(
    `.generated/pangea-ports/wasm/${config.wasmDir}/`,
    appBaseUrl,
  ).href;
  const legacyBase = new URL(`wasm/${config.wasmDir}/`, appBaseUrl).href;
  return generatedBase === legacyBase
    ? [generatedBase]
    : [generatedBase, legacyBase];
}

export function buildPreviewAssetBaseUrl(config: GamePortConfig): string {
  return buildPreviewAssetBaseUrls(config)[0] ?? "";
}
