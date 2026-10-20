import { err, ok, Result, type Result as Outcome } from "neverthrow";
import { zipSync } from "fflate";
import type { ProjectFile, ProjectLevel, ProjectSnapshot } from "@pangea/desktop-contracts";
import { DataType, type GlobalsInterface } from "@/data/globals/globals";
import { serializeDownloadWithWorker } from "@/data/level-io/levelIoWorkerClient";
import { snapshotCanvasImages } from "@/data/level-io/terrainImageSnapshots";
import { combineLevelData, type AtomicLevelData } from "@/data/utils/levelDataUtils";
import { prepareDownloadData } from "@/editor/utils/introPromptUtils";
import { buildScriptPackageManifest, SCRIPT_PACKAGE_MANIFEST_PATH } from "@/editor/subviews/scripts/scriptPackageValidator";
import { buildScriptPackageFilesAsync, importScriptPackageZipAsync, type ScriptWorkspaceState, type ScriptWorkspaceContext } from "@/editor/subviews/scripts/scriptWorkspaceState";

export interface LevelProjectInput {
  globals: GlobalsInterface;
  data: AtomicLevelData;
  mapImages: readonly HTMLCanvasElement[];
  mapFile: File;
  workspace: ScriptWorkspaceState;
  baseLevel: number;
}
export interface PreparedProject {
  manifest: ProjectSnapshot["manifest"];
  files: ProjectFile[];
  level: ProjectLevel;
  removed: string[];
}

export async function prepareProjectSave(project: ProjectSnapshot, levelId: string | null,
  input: LevelProjectInput): Promise<Outcome<PreparedProject, string>> {
  const combined = combineLevelData(input.data);
  if (combined.isErr()) return err(combined.error);
  const images = snapshotCanvasImages(input.mapImages);
  if (images.isErr()) return err(images.error);
  const id = levelId ?? crypto.randomUUID();
  const filename = input.globals.DATA_TYPE === DataType.MIGHTY_MIKE
    ? `level.map-${String(input.baseLevel % 3 + 1)}`
    : input.globals.DATA_TYPE === DataType.TRT_FILE ? "level.ter" : "level.ter.rsrc";
  const serialized = await serializeDownloadWithWorker({ globals: input.globals, fileName: filename,
    mapImagesFileName: input.globals.DATA_TYPE === DataType.MIGHTY_MIKE ? "level.tileset"
      : input.globals.DATA_TYPE === DataType.TRT_FILE ? "level.trt" : "level.ter",
    levelData: prepareDownloadData(combined.value, input.globals), mapImages: images.value });
  if (serialized.isErr()) return err(serialized.error.message);
  const levelFiles = serialized.value.files.map((file) => ({ path: `.pangea/levels/${id}/${file.filename}`, bytes: file.bytes }));
  const first = levelFiles[0];
  if (!first) return err("No level files generated");
  const scripts = await buildScriptPackageFilesAsync(input.workspace);
  if (scripts.isErr()) return err(scripts.error);
  const bindings = input.workspace.levels[input.workspace.context.levelKey];
  if (bindings) levelFiles.push({ path: `.pangea/levels/${id}/bindings.json`, bytes: new TextEncoder().encode(JSON.stringify(bindings)) });
  const previous = project.manifest.levels.find((level) => level.id === id);
  const level: ProjectLevel = { id, name: previous?.name ?? input.mapFile.name, baseLevel: input.baseLevel,
    primary: first.path, texture: levelFiles.find((file) => /\.(?:trt|tileset)$/.test(file.path)
      || file.path.endsWith("level.ter") && file.path !== first.path)?.path,
    files: levelFiles.map((file) => file.path) };
  const files: ProjectFile[] = [...levelFiles, ...scripts.value].map((file) => ({ path: file.path, bytes: Uint8Array.from(file.bytes) }));
  const owned = project.files.filter((file) => file.path.startsWith("Data/Scripts/")
    || previous?.files.includes(file.path));
  return ok({ level, files,
    manifest: { ...project.manifest, levels: [...project.manifest.levels.filter((entry) => entry.id !== id), level] },
    removed: owned.filter((file) => !files.some((next) => next.path === file.path)).map((file) => file.path),
  });
}

export async function loadProjectScripts(files: ProjectFile[], context: ScriptWorkspaceContext) {
  const entries = Object.fromEntries(files.filter((file) => file.path !== SCRIPT_PACKAGE_MANIFEST_PATH && (file.path.startsWith("Data/Scripts/") || file.path === ".luarc.json"))
    .map((file) => [file.path, file.bytes]));
  if (!entries["Data/Scripts/config/project.json"]) return ok(null);
  entries[SCRIPT_PACKAGE_MANIFEST_PATH] = new TextEncoder().encode(JSON.stringify(buildScriptPackageManifest(entries)));
  const archive = Result.fromThrowable(() => zipSync(entries), () => "Cannot prepare project scripts")();
  return archive.isErr() ? err(archive.error) : importScriptPackageZipAsync(archive.value, context);
}
