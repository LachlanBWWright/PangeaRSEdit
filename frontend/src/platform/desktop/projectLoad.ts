import { z } from "zod";
import { fileSchema, type ProjectFile, type ProjectLevel, type ProjectSnapshot } from "@pangea/desktop-contracts";
import { err, ok, ResultAsync, type Result } from "neverthrow";
import { desktopRequest } from "./client";
import { DESKTOP_GAMES } from "./games";
import { loadProjectScripts, type LevelProjectInput } from "./projectBuild";
import type { OpenFileArgs } from "@/editor/loadLogic/openFile";
import { parseLevelDataFile } from "@/editor/loadLogic/parseLevelDataFile";
import { loadMapImages } from "@/editor/loadLogic/loadMapImages";
import { splitLevelData } from "@/data/utils/levelDataUtils";
import { parseNanosaurTerrainWithWorker } from "@/data/level-io/nanosaurTerrainWorkerClient";
import { imagePayloadsToCanvases } from "@/data/level-io/terrainImageSnapshots";
import { createScriptWorkspaceContext, ensureScriptWorkspace } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { DataType } from "@/data/globals/globals";
import { Result as BoundaryResult } from "neverthrow";
import { compileScriptWorkspace, scriptLevelStateSchema } from "@/editor/subviews/scripts/scriptWorkspaceState";

export function guardProjectLoadHandlers(handlers: Omit<OpenFileArgs, "url" | "gameType">, isCurrent: () => boolean): Omit<OpenFileArgs, "url" | "gameType"> {
  return {
    setGlobals: (globals) => { if (isCurrent()) handlers.setGlobals(globals); },
    setMapFile: (file) => { if (isCurrent()) handlers.setMapFile(file); },
    setMapImagesFile: (file) => { if (isCurrent()) handlers.setMapImagesFile(file); },
    setMapImages: (images) => { if (isCurrent()) handlers.setMapImages(images); },
    setData: (data) => { if (isCurrent()) handlers.setData(data); },
  };
}

export async function readProjectFiles(project: ProjectSnapshot, paths?: string[]) {
  return desktopRequest({ operation: "project.read", paths: paths ?? project.files.map((file) => file.path) }, z.array(fileSchema));
}

export async function loadProjectLevel(project: ProjectSnapshot, level: ProjectLevel,
  handlers: Omit<OpenFileArgs, "url" | "gameType">, recovered?: ProjectFile[]): Promise<Result<LevelProjectInput, string>> {
  const game = DESKTOP_GAMES.find((entry) => entry.id === project.manifest.game);
  if (!game) return err("Unknown project game");
  const files = recovered ? ok(recovered) : await readProjectFiles(project, project.files.filter((file) => file.path.startsWith("Data/Scripts/") || level.files.includes(file.path)).map((file) => file.path));
  if (files.isErr()) return err("Could not read project level files");
  const scripts = await loadProjectScripts(files.value, createScriptWorkspaceContext(game.globals, level.baseLevel));
  if (scripts.isErr()) return err(scripts.error);
  const bindingFile = files.value.find((file) => file.path === `.pangea/levels/${level.id}/bindings.json`);
  let workspace = scripts.value;
  if (bindingFile && workspace) {
    const json = BoundaryResult.fromThrowable((): unknown => JSON.parse(new TextDecoder().decode(bindingFile.bytes)), () => "Invalid project level bindings")();
    if (json.isErr()) return err(json.error);
    const bindings = scriptLevelStateSchema.safeParse(json.value);
    if (!bindings.success) return err("Invalid project level bindings");
    const compiled = compileScriptWorkspace({ ...workspace, levels: { ...workspace.levels, [String(level.baseLevel)]: bindings.data } });
    if (compiled.isErr()) return err(compiled.error);
    workspace = compiled.value;
  }
  const primary = toFile(files.value.find((file) => file.path === level.primary));
  const texture = toFile(files.value.find((file) => file.path === level.texture));
  const metadata = toFile(files.value.find((file) => level.files.includes(file.path) && file.path.endsWith(".Meta.rsrc")));
  if (!primary) return err("Project level file was removed from disk");
  const parsed = await parseLevelDataFile({ file: primary, gameType: game.globals,
    companionTextureFile: texture, companionMetadataFile: metadata });
  if (parsed.isErr()) return err(parsed.error);
  let images = [...parsed.value.mapImages];
  if (texture && game.globals.DATA_TYPE !== DataType.MIGHTY_MIKE) {
    const bytes = await ResultAsync.fromPromise(texture.arrayBuffer(), () => "Cannot read project textures");
    if (bytes.isErr()) return err(bytes.error);
    if (game.globals.DATA_TYPE === DataType.TRT_FILE) {
      const decoded = await parseNanosaurTerrainWithWorker(bytes.value);
      if (decoded.isErr()) return err(decoded.error);
      const canvases = imagePayloadsToCanvases(decoded.value);
      if (canvases.isErr()) return err(canvases.error);
      images = canvases.value;
    } else {
      const decoded = await loadMapImages(new DataView(bytes.value), game.globals);
      if (decoded.isErr()) return err(decoded.error);
      images = decoded.value;
    }
  }
  const data = splitLevelData(parsed.value.levelData);
  const input: LevelProjectInput = { globals: game.globals, data, mapFile: primary, mapImages: images,
    baseLevel: level.baseLevel, workspace: workspace ?? ensureScriptWorkspace({}, createScriptWorkspaceContext(game.globals, level.baseLevel)) };
  handlers.setGlobals(game.globals);
  handlers.setMapFile(primary);
  handlers.setMapImagesFile(texture ?? new File([], "level.ter"));
  handlers.setMapImages(images);
  handlers.setData(data);
  return ok(input);
}

function toFile(file: ProjectFile | undefined): File | undefined {
  return file ? new File([Uint8Array.from(file.bytes)], file.path.split("/").at(-1) ?? "level") : undefined;
}
