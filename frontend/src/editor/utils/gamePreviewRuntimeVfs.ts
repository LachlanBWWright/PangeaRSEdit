import { err, ok, Result } from "neverthrow";
import { Game } from "../../data/globals/globals";
import type { AnyLevelInfo, GamePortConfig } from "./gamePortConfig";
import {
  GAME_DISPLAY_NAMES,
  type PreviewVfsFile,
  type PreviewRuntimeModule,
  type PreviewTerrainPaths,
} from "./gamePreviewRuntimeTypes";
import { mapErr } from "../../utils/mapErr";

function isFunctionField<T extends object>(obj: T, field: keyof T): boolean {
  return typeof obj[field] === "function";
}

function isFunction(fn: unknown): fn is (...args: unknown[]) => unknown {
  return typeof fn === "function";
}

function getStringField<T extends object>(
  obj: T,
  field: keyof T,
): string | null {
  const value = obj[field];
  return typeof value === "string" ? value : null;
}

function ensureDir(
  vfs: NonNullable<PreviewRuntimeModule["FS"]>,
  path: string,
): void {
  if (
    isFunctionField(vfs, "analyzePath") &&
    typeof vfs.analyzePath === "function"
  ) {
    const analyzePath = vfs.analyzePath;
    const analyzeResult = Result.fromThrowable(
      () => analyzePath(path),
      (e) => mapErr(e),
    )();
    if (analyzeResult.isOk() && analyzeResult.value.exists) return;
  }
  Result.fromThrowable(
    () => {
      vfs.mkdir?.(path);
    },
    (e) => mapErr(e),
  )();
}

function ensureParentDirectory(
  module: PreviewRuntimeModule,
  filePath: string,
): void {
  const normalizedPath = filePath.startsWith("/") ? filePath : `/${filePath}`;
  const segments = normalizedPath
    .split("/")
    .filter((segment) => segment.length > 0);
  if (segments.length < 2) {
    return;
  }

  const vfs = module.FS;
  if (!vfs || !isFunctionField(vfs, "mkdir")) {
    return;
  }

  let currentPath = "";
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index] ?? "";
    currentPath = `${currentPath}/${segment}`;
    ensureDir(vfs, currentPath);
  }
}

function ensurePreviewPrefsDirs(
  module: PreviewRuntimeModule,
  config: GamePortConfig,
): void {
  const fsCreatePath = module.FS_createPath;

  if (isFunction(fsCreatePath)) {
    const createResult = Result.fromThrowable(
      () => {
        fsCreatePath("/", "home", true, true);
        fsCreatePath("/home", "web_user", true, true);
        fsCreatePath("/home/web_user", ".config", true, true);
        fsCreatePath(
          `/home/web_user/.config`,
          config.prefsFolderName,
          true,
          true,
        );
      },
      (e) => mapErr(e),
    )();
    if (createResult.isOk()) return;
  }

  const vfs = module.FS;
  if (!vfs) {
    return;
  }

  ensureDir(vfs, "/home");
  ensureDir(vfs, "/home/web_user");
  ensureDir(vfs, "/home/web_user/.config");
  ensureDir(vfs, `/home/web_user/.config/${config.prefsFolderName}`);
}

/**
 * Writes a single file into the Emscripten VFS.
 * Tries Module.FS.writeFile first (available in most builds).
 * Falls back to FS_unlink + FS_createDataFile for builds that don't expose Module.FS
 * (e.g. CroMag Rally).  FS_unlink failure (file not yet present) is silenced so that
 * FS_createDataFile always runs.
 */
function writeFileToVfs(
  module: PreviewRuntimeModule,
  path: string,
  data: Uint8Array,
): Result<void, string> {
  const vfs = module.FS;
  if (vfs && isFunctionField(vfs, "writeFile")) {
    return Result.fromThrowable(
      () => {
        vfs.writeFile(path, data);
      },
      (e) => mapErr(e),
    )();
  }
  if (!isFunction(module.FS_createDataFile)) {
    return err("No VFS write mechanism available");
  }
  const lastSlash = path.lastIndexOf("/");
  const parentDir = path.substring(0, lastSlash);
  const filename = path.substring(lastSlash + 1);
  if (isFunction(module.FS_unlink)) {
    const unlink = module.FS_unlink;
    Result.fromThrowable(
      () => unlink(path),
      (e) => mapErr(e),
    )();
  }
  const createDataFile = module.FS_createDataFile;
  if (!isFunction(createDataFile)) {
    return err("No VFS write mechanism available");
  }
  const result = Result.fromThrowable(
    () => createDataFile(parentDir, filename, data, true, true, false),
    (e) => mapErr(e),
  )();
  return result.isOk() ? ok(undefined) : err(result.error);
}

function logPreviewRuntime(message: string, details?: unknown): void {
  if (details === undefined) {
    console.info(`[GamePreview] ${message}`);
    return;
  }
  console.info(`[GamePreview] ${message}`, details);
}

/**
 * Writes terrain bytes to the Emscripten VFS.
 * Runs in onRuntimeInitialized, before callMain, so the game reads the injected
 * bytes when it opens the terrain file in main().
 */
function writeTerrainToVfs(
  module: PreviewRuntimeModule,
  config: GamePortConfig,
  currentLevelInfo: AnyLevelInfo | undefined,
  terrainPaths: PreviewTerrainPaths,
  terrainDataBytes: Uint8Array | null,
  terrainRsrcBytes: Uint8Array | null,
  terrainTextureBytes: Uint8Array | null,
  customFiles: readonly PreviewVfsFile[] | undefined,
  onError: (text: string) => void,
): void {
  const hasTerrainBytes = Boolean(
    terrainDataBytes ?? terrainRsrcBytes ?? terrainTextureBytes,
  );
  const hasCustomFiles = Boolean(customFiles && customFiles.length > 0);

  if (!hasTerrainBytes && !hasCustomFiles) {
    logPreviewRuntime("No terrain bytes supplied for VFS injection", {
      game: GAME_DISPLAY_NAMES[config.game],
      level: currentLevelInfo,
      terrainPaths,
    });
    return;
  }

  const vfs = module.FS;
  if (vfs && isFunctionField(vfs, "mkdir")) {
    ensureDir(vfs, "/Data");
    ensureDir(
      vfs,
      config.game === Game.MIGHTY_MIKE ? "/Data/Maps" : "/Data/Terrain",
    );
  }

  function writeTerrainDataPath(
    path: string,
    data: Uint8Array,
  ): Result<void, string> {
    const pathVariants = new Set<string>([path]);

    if (config.game === Game.MIGHTY_MIKE) {
      if (path.startsWith("/")) {
        pathVariants.add(path.slice(1));
      } else {
        pathVariants.add(`/${path}`);
      }
    }

    const failedWrites: string[] = [];
    for (const candidatePath of pathVariants) {
      const writeResult = writeFileToVfs(module, candidatePath, data);
      if (writeResult.isErr()) {
        failedWrites.push(`${candidatePath}: ${writeResult.error}`);
        continue;
      }
      logPreviewRuntime("Wrote terrain data to VFS", {
        path: candidatePath,
        byteLength: data.byteLength,
      });
      return ok(undefined);
    }

    return err(failedWrites.join("; "));
  }

  if (terrainDataBytes) {
    logPreviewRuntime("Injecting terrain data bytes", {
      game: GAME_DISPLAY_NAMES[config.game],
      levelNumber:
        currentLevelInfo && "levelNumber" in currentLevelInfo
          ? currentLevelInfo.levelNumber
          : undefined,
      dataPath: terrainPaths.dataPath,
      altDataPath: terrainPaths.altDataPath,
      byteLength: terrainDataBytes.byteLength,
    });
    const writeDataResult = writeTerrainDataPath(
      terrainPaths.dataPath,
      terrainDataBytes,
    );
    if (writeDataResult.isErr()) {
      onError(`Failed to write terrain data file: ${writeDataResult.error}`);
      return;
    }
    if (terrainPaths.altDataPath) {
      const altWriteResult = writeTerrainDataPath(
        terrainPaths.altDataPath,
        terrainDataBytes,
      );
      if (altWriteResult.isErr()) {
        console.warn(
          "[GamePreview] Failed to write alternate terrain data path",
          altWriteResult.error,
        );
      }
    }
  }

  if (terrainRsrcBytes && terrainPaths.rsrcPath) {
    logPreviewRuntime("Injecting terrain resource bytes", {
      rsrcPath: terrainPaths.rsrcPath,
      byteLength: terrainRsrcBytes.byteLength,
    });
    const writeRsrcResult = writeFileToVfs(
      module,
      terrainPaths.rsrcPath,
      terrainRsrcBytes,
    );
    if (writeRsrcResult.isErr()) {
      onError(`Failed to write terrain rsrc file: ${writeRsrcResult.error}`);
      return;
    }
  }

  if (terrainTextureBytes && terrainPaths.texturePath) {
    logPreviewRuntime("Injecting terrain texture bytes", {
      texturePath: terrainPaths.texturePath,
      byteLength: terrainTextureBytes.byteLength,
    });
    const writeTextureResult = writeFileToVfs(
      module,
      terrainPaths.texturePath,
      terrainTextureBytes,
    );
    if (writeTextureResult.isErr()) {
      onError(
        `Failed to write terrain texture file: ${writeTextureResult.error}`,
      );
      return;
    }
  }

  if (customFiles && customFiles.length > 0) {
    for (const file of customFiles) {
      ensureParentDirectory(module, file.path);
      const writeCustomResult = writeFileToVfs(module, file.path, file.data);
      if (writeCustomResult.isErr()) {
        onError(
          `Failed to write preview override file ${file.path}: ${writeCustomResult.error}`,
        );
        return;
      }
      logPreviewRuntime("Injected preview override file", {
        path: file.path,
        byteLength: file.data.byteLength,
      });
    }
  }

  if (
    config.terrain &&
    config.terrain.setPathFn &&
    config.terrain.getSetPathArg &&
    currentLevelInfo &&
    "terrainFile" in currentLevelInfo
  ) {
    const terrain = config.terrain;
    const terrainFile = currentLevelInfo.terrainFile;
    if (typeof terrainFile !== "string") {
      return;
    }
    const setPathFn = terrain.setPathFn;
    const setPathFnStr = getStringField({ setPathFn }, "setPathFn");
    if (!setPathFnStr) {
      return;
    }
    const getSetPathArg = terrain.getSetPathArg;
    if (!isFunction(getSetPathArg)) {
      return;
    }
    const setPathArg =
      config.game === Game.NANOSAUR
        ? terrainPaths.dataPath
        : getSetPathArg(terrainFile);
    logPreviewRuntime("Setting runtime terrain override path", {
      fn: setPathFnStr,
      arg: setPathArg,
    });
    Result.fromThrowable(
      () => module.ccall?.(setPathFnStr, null, ["string"], [setPathArg]),
      (e) => mapErr(e),
    )();
  }
}

export { ensurePreviewPrefsDirs, writeFileToVfs, writeTerrainToVfs };
