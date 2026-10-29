import { dialog, type BrowserWindow } from "electron";
import { err, ok } from "neverthrow";
import type { HostRequest } from "@pangea/desktop-contracts";
import { failure, io } from "./files.ts";
import type { PackStore } from "./packStore.ts";
import type { ProjectStore } from "./projectStore.ts";
import type { GameStore } from "./gameStore.ts";
import { readBlenderExecutable } from "./assetRequests.ts";

type PackRequest = Extract<HostRequest, { operation: "packs.export" | "packs.open" | "packs.list" | "packs.play" | "packs.import" }>;
export async function handlePackRequest(request: PackRequest, packs: PackStore, project: ProjectStore, games: GameStore, window: BrowserWindow) {
  if (request.operation === "packs.list") return packs.list();
  if (request.operation === "packs.play") return packs.play(request.id, request.levelId, games);
  if (request.operation === "packs.export") {
    const snapshot = await project.inspect();
    if (snapshot.isErr()) return err(snapshot.error);
    const chosen = await io(() => dialog.showSaveDialog(window, { title: "Export playable level pack",
      defaultPath: `${snapshot.value.manifest.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.pangeapack`,
      filters: [{ name: "Pangea playable pack", extensions: ["pangeapack"] }] }), "Cannot choose pack destination");
    if (chosen.isErr()) return err(chosen.error);
    if (chosen.value.canceled || !chosen.value.filePath) return err(failure("Pack export cancelled", "cancelled"));
    const blender = request.includeEditableProject && request.includeAuthoringSources ? await readBlenderExecutable() : ok(undefined);
    return blender.isErr() ? err(blender.error) : packs.export(project, request.revision, request.levels, chosen.value.filePath,
      request.includeEditableProject ?? false, request.includeAuthoringSources ?? false, blender.value);
  }
  if (request.operation === "packs.open") {
    const chosen = await io(() => dialog.showOpenDialog(window, { title: "Open playable level pack", properties: ["openFile"],
      filters: [{ name: "Pangea playable pack", extensions: ["pangeapack"] }] }), "Cannot choose pack");
    if (chosen.isErr()) return err(chosen.error);
    const file = chosen.value.filePaths[0];
    if (chosen.value.canceled || !file) return err(failure("Pack selection cancelled", "cancelled"));
    return packs.open(file);
  }
  const chosen = await io(() => dialog.showOpenDialog(window, { title: "Import editable pack project into an empty folder", properties: ["openDirectory", "createDirectory"] }), "Cannot choose import folder");
  if (chosen.isErr()) return err(chosen.error);
  const folder = chosen.value.filePaths[0];
  if (chosen.value.canceled || !folder) return err(failure("Pack import cancelled", "cancelled"));
  return packs.importProject(request.id, folder, project);
}
