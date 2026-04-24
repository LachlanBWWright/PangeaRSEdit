import { err, ok, Result } from "neverthrow";
import { Game } from "../../data/globals/globals";
import type { AnyLevelInfo, GamePortConfig } from "./gamePortConfig";
import {
  GAME_DISPLAY_NAMES,
  type PreviewRuntimeModule,
  type PreviewTerrainPaths,
} from "./gamePreviewRuntimeTypes";

function ensureDir(
  vfs: NonNullable<PreviewRuntimeModule["FS"]>,
  path: string,
): void {
  if (typeof vfs.analyzePath === "function") {
    const analyzePath = vfs.analyzePath;
    const analyzeResult = Result.fromThrowable(
      () => analyzePath(path),
      (e) => (e instanceof Error ? e : new Error(String(e))),
    )();
    if (analyzeResult.isOk() && analyzeResult.value.exists) return;
  }
  Result.fromThrowable(
    () => {
      vfs.mkdir?.(path);
    },
    (e) => (e instanceof Error ? e : new Error(String(e))),
  )();
}

function ensurePreviewPrefsDirs(
  module: PreviewRuntimeModule,
  config: GamePortConfig,
): void {
  const fsCreatePath = module.FS_createPath;

  if (typeof fsCreatePath === "function") {
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
      (e) => (e instanceof Error ? e : new Error(String(e))),
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
): Result<void, Error> {
  const vfs = module.FS;
  if (vfs && typeof vfs.writeFile === "function") {
    return Result.fromThrowable(
      () => {
        vfs.writeFile(path, data);
      },
      (e) => (e instanceof Error ? e : new Error(String(e))),
    )();
  }
  if (typeof module.FS_createDataFile !== "function") {
    return err(new Error("No VFS write mechanism available"));
  }
  const lastSlash = path.lastIndexOf("/");
  const parentDir = path.substring(0, lastSlash);
  const filename = path.substring(lastSlash + 1);
  if (typeof module.FS_unlink === "function") {
    const unlink = module.FS_unlink;
    Result.fromThrowable(
      () => unlink(path),
      (e) => (e instanceof Error ? e : new Error(String(e))),
    )();
  }
  const createDataFile = module.FS_createDataFile;
  if (typeof createDataFile !== "function") {
    return err(new Error("No VFS write mechanism available"));
  }
  return Result.fromThrowable(
    () => createDataFile(parentDir, filename, data, true, true, false),
    (e) => (e instanceof Error ? e : new Error(String(e))),
  )();
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
  onError: (text: string) => void,
): void {
  if (!(terrainDataBytes ?? terrainRsrcBytes ?? terrainTextureBytes)) {
    logPreviewRuntime("No terrain bytes supplied for VFS injection", {
      game: GAME_DISPLAY_NAMES[config.game],
      level: currentLevelInfo,
      terrainPaths,
    });
    return;
  }

  const vfs = module.FS;
  if (vfs && typeof vfs.mkdir === "function") {
    ensureDir(vfs, "/Data");
    ensureDir(
      vfs,
      config.game === Game.MIGHTY_MIKE ? "/Data/Maps" : "/Data/Terrain",
    );
  }

  function writeTerrainDataPath(
    path: string,
    data: Uint8Array,
  ): Result<void, Error> {
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
        failedWrites.push(`${candidatePath}: ${writeResult.error.message}`);
        continue;
      }
      logPreviewRuntime("Wrote terrain data to VFS", {
        path: candidatePath,
        byteLength: data.byteLength,
      });
      return ok(undefined);
    }

    return err(new Error(failedWrites.join("; ")));
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
      onError(
        `Failed to write terrain data file: ${writeDataResult.error.message}`,
      );
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
      onError(
        `Failed to write terrain rsrc file: ${writeRsrcResult.error.message}`,
      );
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
        `Failed to write terrain texture file: ${writeTextureResult.error.message}`,
      );
      return;
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
    if (typeof setPathFn !== "string") {
      return;
    }
    const getSetPathArg = terrain.getSetPathArg;
    if (typeof getSetPathArg !== "function") {
      return;
    }
    const setPathArg =
      config.game === Game.NANOSAUR
        ? terrainPaths.dataPath
        : getSetPathArg(terrainFile);
    logPreviewRuntime("Setting runtime terrain override path", {
      fn: setPathFn,
      arg: setPathArg,
    });
    Result.fromThrowable(
      () => module.ccall?.(setPathFn, null, ["string"], [setPathArg]),
      (e) => (e instanceof Error ? e : new Error(String(e))),
    )();
  }
}

export { ensurePreviewPrefsDirs, writeFileToVfs, writeTerrainToVfs };
