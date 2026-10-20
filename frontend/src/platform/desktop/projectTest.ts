import { err, ok, type Result } from "neverthrow";
import type { ProjectFile } from "@pangea/desktop-contracts";
import { buildPreviewTerrainBlobs } from "@/data/saveMap/saveMap";
import { combineLevelData } from "@/data/utils/levelDataUtils";
import { GAME_PORT_CONFIGS, getLevelIndex } from "@/editor/utils/gamePortConfig";
import { getPreviewTerrainPaths } from "@/editor/utils/gamePreviewRuntimeTypes";
import { buildPreviewScriptFilesAsync, ensureScriptWorkspace } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { Game } from "@/data/globals/globals";
import type { LevelProjectInput } from "./projectBuild";

export async function prepareNativeTest(input: LevelProjectInput, withScripts = true): Promise<Result<{ files: ProjectFile[]; args: string[] }, string>> {
  const combined = combineLevelData(input.data);
  if (combined.isErr()) return err(combined.error);
  const blobs = await buildPreviewTerrainBlobs(combined.value, input.globals, [...input.mapImages]);
  if (!blobs) return err("Cannot serialize test level");
  const config = GAME_PORT_CONFIGS[input.globals.GAME_TYPE];
  const info = config.levels.find((level) => getLevelIndex(level) === input.baseLevel);
  const paths = getPreviewTerrainPaths(info, config);
  if (!paths) return err("Choose a supported base level or scene");
  const scripts = await buildPreviewScriptFilesAsync(withScripts ? input.workspace : ensureScriptWorkspace({}, input.workspace.context));
  if (scripts.isErr()) return err(scripts.error);
  const files: ProjectFile[] = scripts.value.map((file) => ({ path: file.path.replace(/^\//, ""), bytes: Uint8Array.from(file.data) }));
  const candidates = [
    { path: paths.dataPath, bytes: blobs.dataBytes }, { path: paths.rsrcPath, bytes: blobs.rsrcBytes },
    { path: paths.texturePath, bytes: blobs.textureBytes }, { path: paths.altDataPath, bytes: blobs.dataBytes },
    { path: paths.altTexturePath, bytes: blobs.textureBytes },
  ];
  for (const file of candidates) if (file.path && file.bytes) files.push({ path: file.path.replace(/^\//, ""), bytes: Uint8Array.from(file.bytes) });
  const level = input.globals.GAME_TYPE === Game.MIGHTY_MIKE
    ? `${String(Math.floor(input.baseLevel / 3))}:${String(input.baseLevel % 3)}` : String(input.baseLevel);
  return ok({ files, args: [input.globals.GAME_TYPE === Game.CRO_MAG ? "--track" : "--level", level] });
}
