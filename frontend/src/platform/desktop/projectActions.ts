import { z } from "zod";
import { fileSchema, projectSnapshotSchema, type ProjectSnapshot } from "@pangea/desktop-contracts";
import { toast } from "sonner";
import { desktopRequest } from "./client";
import { prepareProjectSave, type LevelProjectInput } from "./projectBuild";
import { prepareNativeTest } from "./projectTest";
import { readProjectFiles } from "./projectLoad";
import { desktopGameId } from "./games";
import { readBoundAssets } from "./projectAssetBindings";

export async function saveProjectLevel(project: ProjectSnapshot, levelId: string | null, input: LevelProjectInput,
  saved: (snapshot: ProjectSnapshot, levelId: string, capture: LevelProjectInput) => void, recovery = false) {
  const prepared = await prepareProjectSave(project, levelId, input);
  if (prepared.isErr()) { if (!recovery) toast.error(prepared.error); return false; }
  if (recovery) {
    const result = await desktopRequest({ operation: "project.backup", manifest: prepared.value.manifest, files: prepared.value.files }, z.void());
    if (result.isErr()) toast.error("Recovery snapshot failed", { description: result.error.message });
    return result.isOk();
  }
  const result = await desktopRequest({ operation: "project.save", revision: project.revision,
    manifest: prepared.value.manifest, files: prepared.value.files, removed: prepared.value.removed }, projectSnapshotSchema);
  if (result.isErr()) { toast.error("Project save failed", { description: result.error.message }); return false; }
  saved(result.value, prepared.value.level.id, input);
  toast.success("Project saved");
  return true;
}

export async function testProjectLevel(project: ProjectSnapshot | null, input: LevelProjectInput, withScripts = true, levelId: string | null = null) {
  if (project && project.manifest.game !== desktopGameId(input.globals.GAME_TYPE)) { toast.error("This level targets a different game from the project"); return; }
  const prepared = await prepareNativeTest(input, withScripts);
  if (prepared.isErr()) { toast.error(prepared.error); return; }
  const assets = project ? await readProjectFiles(project, project.files.filter((file) => file.path.startsWith("Data/") && !file.path.startsWith("Data/Scripts/")).map((file) => file.path)) : null;
  if (assets?.isErr()) { toast.error(assets.error.message); return; }
  const bound = project ? await readBoundAssets(project, levelId) : null;
  if (bound?.isErr()) { toast.error(bound.error); return; }
  const outputs = new Map([...(assets?.isOk() ? assets.value : []), ...prepared.value.files, ...(bound?.isOk() ? bound.value : [])].map((file) => [file.path, file]));
  const result = await desktopRequest({ operation: "games.test", game: desktopGameId(input.globals.GAME_TYPE),
    args: prepared.value.args, files: [...outputs.values()] }, z.void());
  if (result.isErr()) toast.error("Could not test project", { description: result.error.message });
  else toast.success("Game launched with a snapshot of current edits");
}
export async function playInstalledGame(input: LevelProjectInput) {
  const result = await desktopRequest({ operation: "games.play", game: desktopGameId(input.globals.GAME_TYPE) }, z.void());
  if (result.isErr()) toast.error(result.error.message);
}

export async function readRecovery() {
  return desktopRequest({ operation: "project.recover", action: "read" }, z.array(fileSchema));
}
