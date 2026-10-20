import { dialog, type BrowserWindow } from "electron";
import { err, ok, type Result } from "neverthrow";
import type { HostError, HostRequest } from "@pangea/desktop-contracts";
import { failure, io } from "./files.ts";
import type { ProjectStore } from "./projectStore.ts";
import type { GameStore } from "./gameStore.ts";

export async function handleRequest(request: HostRequest, project: ProjectStore, games: GameStore,
  window: BrowserWindow, markDirty: (dirty: boolean) => void): Promise<Result<unknown, HostError>> {
  switch (request.operation) {
    case "project.open":
    case "project.create": {
      const selected = await chooseFolder(window, request.operation === "project.open" ? "Open project folder" : "Choose project folder");
      if (selected.isErr()) return err(selected.error);
      return request.operation === "project.open" ? project.open(selected.value)
        : project.create(selected.value, request.name, request.game);
    }
    case "project.inspect": return project.inspect();
    case "project.read": return project.read(request.paths);
    case "project.save": return project.save(request.revision, request.manifest, request.files, request.removed);
    case "project.backup": return project.backup(request.manifest, request.files);
    case "project.recover": return request.action === "read" ? project.recover() : project.discardRecovery();
    case "games.catalog": return games.releases(request.prerelease);
    case "games.installed": return games.load();
    case "games.install": return games.install(request.game, request.tag, request.kind);
    case "games.assets": return games.assets.load();
    case "games.remove-assets": return games.assets.remove(request.game);
    case "games.cancel": return games.cancel(request.game);
    case "games.remove": return games.remove(request.game);
    case "games.play": return games.launch(request.game);
    case "games.test": return games.launch(request.game, request.files, request.args);
    case "games.locate": {
      const consent = await io(() => dialog.showMessageBox(window, {
        type: "question", buttons: ["Cancel", "Choose trusted game"], defaultId: 0, cancelId: 0,
        message: "Choose a trusted game installation", detail: "The editor will run its executable to check compatibility and launch games.",
      }), "Cannot show game selection");
      if (consent.isErr()) return err(consent.error);
      if (consent.value.response !== 1) return err(failure("Selection cancelled", "cancelled"));
      const folder = await chooseFolder(window, "Choose installed game folder");
      return folder.isErr() ? err(folder.error) : games.locate(request.game, folder.value);
    }
    case "host.dirty": markDirty(request.dirty); return ok(undefined);
    case "host.info": return ok({ platform: process.platform, arch: process.arch });
  }
}

async function chooseFolder(window: BrowserWindow, title: string): Promise<Result<string, HostError>> {
  const selected = await io(() => dialog.showOpenDialog(window, { title, properties: ["openDirectory", "createDirectory"] }), "Cannot open folder picker");
  if (selected.isErr()) return err(selected.error);
  const folder = selected.value.filePaths[0];
  return selected.value.canceled || !folder ? err(failure("Folder selection cancelled", "cancelled")) : ok(folder);
}
