import { dialog, type BrowserWindow } from "electron";
import { err, ok, type Result } from "neverthrow";
import type { HostError, HostRequest } from "@pangea/desktop-contracts";
import { failure, io } from "./files.ts";
import type { ProjectStore } from "./projectStore.ts";
import type { GameStore } from "./gameStore.ts";
import { openProjectExternal } from "./projectExternal.ts";
import { readEditorSettings, configureEditor } from "./editorSettings.ts";
import { checkEditorUpdates, openEditorRelease } from "./editorUpdates.ts";
import { handlePackRequest } from "./packRequests.ts";
import type { PackStore } from "./packStore.ts";
import { upstreamCatalog } from "./upstreamCatalog.ts";
import { handleAssetRequest } from "./assetRequests.ts";
import { handleSpriteRequest } from "./spriteRequests.ts";

export async function handleRequest(request: HostRequest, project: ProjectStore, games: GameStore,
  window: BrowserWindow, markDirty: (dirty: boolean) => void, packs: PackStore): Promise<Result<unknown, HostError>> {
  switch (request.operation) {
    case "sprites.list": case "sprites.link": case "sprites.read": case "sprites.commit": case "sprites.external":
    case "sprites.configure-editor": return handleSpriteRequest(request, project, window);
    case "assets.list": case "assets.pending": case "assets.preview": case "assets.import": case "assets.import-buffer": case "assets.reimport":
    case "assets.accept": case "assets.discard": case "assets.undo": case "assets.duplicate": case "assets.external": case "assets.cancel":
    case "assets.configure-blender": case "assets.export-bundle": case "assets.import-bundle":
    case "assets.import-reversible": case "assets.undo-import": return handleAssetRequest(request, project, window);
    case "project.review": return project.reviews.review(request.base, request.edits);
    case "project.apply-review": return project.reviews.apply(request.id, request.choices);
    case "packs.list": return packs.list();
    case "packs.remove": return packs.remove(request.id);
    case "packs.open":
    case "packs.play":
    case "packs.import":
    case "packs.export": return handlePackRequest(request, packs, project, games, window);
    case "editor.updates": return checkEditorUpdates();
    case "editor.release": return openEditorRelease();
    case "editor.preferences": return readEditorSettings();
    case "editor.configure": return configureEditor(window, request.editor);
    case "games.runs": return ok(games.runs.list());
    case "games.script-objects": return games.runs.queryObjects(request.id, request);
    case "games.script-state": return games.runs.queryState(request.id, request);
    case "games.asset-files": return games.assetFiles(request.game);
    case "games.asset-read": return games.readAsset(request.game, request.path);
    case "games.stop": return games.runs.stop(request.id);
    case "games.restart": return games.runs.restart(request.id);
    case "project.recent": return project.history.list();
    case "project.restore": {
      const recent = await project.history.list();
      if (recent.isErr()) return err(recent.error);
      const last = recent.value[0];
      if (!last) return ok(null);
      const opened = await project.reopen(last.folder);
      return opened.map((snapshot) => ({ project: snapshot,
        levelId: snapshot.manifest.levels.find((level) => level.id === last.levelId)?.id ?? snapshot.manifest.levels[0]?.id ?? null }));
    }
    case "project.session": {
      const snapshot = await project.inspect();
      if (snapshot.isErr()) return err(snapshot.error);
      if (request.levelId && !snapshot.value.manifest.levels.some((level) => level.id === request.levelId)) return err(failure("Unknown project level", "invalid"));
      return project.history.remember(snapshot.value.folder, snapshot.value.manifest.name, request.levelId);
    }
    case "project.reopen": return project.reopen(request.folder);
    case "project.external": return openProjectExternal(project.folder(), request.path, request.action, request.line);
    case "project.copy": {
      const selected = await chooseFolder(window, "Save project as — choose an empty folder");
      return selected.isErr() ? err(selected.error) : project.copy(selected.value, request.revision);
    }
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
    case "games.upstream-catalog": return ok(upstreamCatalog());
    case "games.install-upstream-data": return games.installUpstreamData(request.game);
    case "games.installed": return games.load();
    case "games.install": return games.install(request.game, request.tag);
    case "games.assets": return games.assets.load();
    case "games.remove-assets": return games.removeAssets(request.game);
    case "games.cancel": return games.cancel(request.game);
    case "games.remove": return games.remove(request.game);
    case "games.play": return games.launch(request.game);
    case "games.test": return games.launch(request.game, request.files, request.args, project.folder());
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
