import { zipSync } from "fflate";
import { err, ok, type Result } from "neverthrow";
import type { GlobalsInterface } from "@/data/globals/globals";
import { serializeDownloadWithWorker } from "@/data/level-io/levelIoWorkerClient";
import { snapshotCanvasImages } from "@/data/level-io/terrainImageSnapshots";
import { buildPreviewTerrainBlobs } from "@/data/saveMap/saveMap";
import { combineLevelData } from "@/data/utils/levelDataUtils";
import { prepareDownloadData } from "@/editor/utils/introPromptUtils";
import type {
  FenceData,
  HeaderData,
  ItemData,
  LiquidData,
  SplineData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { buildOriginalLevelFileName } from "./scriptWorkspaceHelpers";
import {
  buildPreviewScriptFiles,
  buildScriptPackageFiles,
  type ScriptWorkspaceState,
} from "./scriptWorkspaceState";

interface ScriptLevelDataInput {
  readonly headerData: HeaderData;
  readonly itemData: ItemData | null;
  readonly liquidData: LiquidData | null;
  readonly fenceData: FenceData | null;
  readonly splineData: SplineData | null;
  readonly terrainData: TerrainData;
}

interface ScriptRuntimeActionParams extends ScriptLevelDataInput {
  readonly globals: GlobalsInterface;
  readonly levelNumber: number | null;
  readonly mapImages: readonly HTMLCanvasElement[];
}

interface ScriptArchiveFile {
  readonly path: string;
  readonly bytes: Uint8Array;
}

export interface ScriptPreviewBundle {
  readonly dataBytes: Uint8Array | null;
  readonly rsrcBytes: Uint8Array | null;
  readonly textureBytes: Uint8Array | null;
  readonly customFiles: readonly { readonly path: string; readonly data: Uint8Array }[];
  readonly nextState: ScriptWorkspaceState;
}

function buildLevelData(
  params: ScriptLevelDataInput,
): Result<ReturnType<typeof prepareDownloadData>, string> {
  const combinedResult = combineLevelData({
    headerData: params.headerData,
    itemData: params.itemData,
    liquidData: params.liquidData,
    fenceData: params.fenceData,
    splineData: params.splineData,
    terrainData: params.terrainData,
  });
  if (combinedResult.isErr()) {
    return err(combinedResult.error);
  }
  return ok(combinedResult.value);
}

async function buildOriginalCompatibleFiles(
  params: ScriptRuntimeActionParams,
): Promise<Result<readonly ScriptArchiveFile[], string>> {
  const levelDataResult = buildLevelData(params);
  if (levelDataResult.isErr()) {
    return err(levelDataResult.error);
  }

  const snapshotsResult = snapshotCanvasImages(params.mapImages);
  if (snapshotsResult.isErr()) {
    return err(snapshotsResult.error);
  }

  const serializeResult = await serializeDownloadWithWorker({
    globals: params.globals,
    fileName: buildOriginalLevelFileName(
      params.globals.GAME_TYPE,
      params.levelNumber,
    ),
    levelData: prepareDownloadData(levelDataResult.value, params.globals),
    mapImages: snapshotsResult.value,
  });

  if (serializeResult.isErr()) {
    return err(serializeResult.error.message);
  }

  return ok(
    serializeResult.value.files.map((file) => ({
      path: file.filename,
      bytes: file.bytes,
    })),
  );
}

export async function prepareScriptPreviewBundle(
  params: ScriptRuntimeActionParams & {
    readonly compiledState: ScriptWorkspaceState;
  },
): Promise<Result<ScriptPreviewBundle, string>> {
  const previewFilesResult = buildPreviewScriptFiles(params.compiledState);
  if (previewFilesResult.isErr()) {
    return err(previewFilesResult.error);
  }

  const levelDataResult = buildLevelData(params);
  if (levelDataResult.isErr()) {
    return err(levelDataResult.error);
  }

  const previewTerrain = await buildPreviewTerrainBlobs(
    prepareDownloadData(levelDataResult.value, params.globals),
    params.globals,
    [...params.mapImages],
  );
  if (!previewTerrain) {
    return err("Failed to prepare preview terrain data");
  }

  return ok({
    dataBytes: previewTerrain.dataBytes,
    rsrcBytes: previewTerrain.rsrcBytes,
    textureBytes: previewTerrain.textureBytes,
    customFiles: previewFilesResult.value,
    nextState: {
      ...params.compiledState,
      statusLog: [
        ...params.compiledState.statusLog,
        "Prepared in-browser preview bundle",
      ].slice(-20),
    },
  });
}

export async function buildOriginalCompatibleArchive(
  params: ScriptRuntimeActionParams,
): Promise<Result<Uint8Array, string>> {
  const filesResult = await buildOriginalCompatibleFiles(params);
  if (filesResult.isErr()) {
    return err(filesResult.error);
  }

  return ok(
    zipSync(
      Object.fromEntries(filesResult.value.map((file) => [file.path, file.bytes])),
      { level: 6 },
    ),
  );
}

export async function buildExtendedLevelArchive(
  params: ScriptRuntimeActionParams & {
    readonly compiledState: ScriptWorkspaceState;
  },
): Promise<Result<Uint8Array, string>> {
  const originalFilesResult = await buildOriginalCompatibleFiles(params);
  if (originalFilesResult.isErr()) {
    return err(originalFilesResult.error);
  }

  const scriptFilesResult = buildScriptPackageFiles(params.compiledState);
  if (scriptFilesResult.isErr()) {
    return err(scriptFilesResult.error);
  }

  const archiveEntries: Record<string, Uint8Array> = {};
  for (const file of originalFilesResult.value) {
    archiveEntries[`Original/${file.path}`] = file.bytes;
  }
  for (const file of scriptFilesResult.value) {
    archiveEntries[file.path] = file.bytes;
  }

  return ok(zipSync(archiveEntries, { level: 6 }));
}