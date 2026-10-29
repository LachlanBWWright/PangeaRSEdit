import path from "node:path";
import * as fs from "node:fs/promises";
import { app, dialog, shell, type BrowserWindow } from "electron";
import { z } from "zod";
import { err, ok, Result, type Result as Outcome } from "neverthrow";
import type { HostError, HostRequest } from "@pangea/desktop-contracts";
import type { ProjectStore } from "./projectStore.ts";
import { atomicWrite, failure, io, parseJson, statOrMissing } from "./files.ts";
import { startProcess } from "./processes.ts";
import { exportPortableAssets, importPortableAssets } from "./assetPortable.ts";
import { importReversibleAssets, undoAssetImport } from "./assetImportTransaction.ts";

const blenderSettingsSchema = z.object({ executable: z.string().min(1) });
const settingsPath = () => path.join(app.getPath("userData"), "blender-preferences.json");
export async function readBlenderExecutable(): Promise<Outcome<string | undefined, HostError>> {
  const info = await statOrMissing(settingsPath());
  if (info.isErr()) return err(info.error);
  if (!info.value) return ok(undefined);
  const text = await io(() => fs.readFile(settingsPath(), "utf8"), "Cannot read Blender preferences");
  if (text.isErr()) return err(text.error);
  const json = parseJson(text.value);
  if (json.isErr()) return err(json.error);
  const parsed = blenderSettingsSchema.safeParse(json.value);
  return parsed.success ? ok(parsed.data.executable) : err(failure("Invalid Blender preferences", "invalid"));
}
async function chooseSource(window: BrowserWindow): Promise<Outcome<string, HostError>> {
  const picked = await io(() => dialog.showOpenDialog(window, { title: "Import model authoring source", properties: ["openFile"],
    filters: [{ name: "Models and Blender sources", extensions: ["blend", "gltf", "glb", "bg3d", "3dmf"] }] }), "Cannot choose asset source");
  if (picked.isErr()) return err(picked.error);
  const file = picked.value.filePaths[0];
  return picked.value.canceled || !file ? err(failure("Asset selection cancelled", "cancelled")) : ok(file);
}
export async function handleAssetRequest(request: HostRequest, project: ProjectStore, window: BrowserWindow): Promise<Outcome<unknown, HostError>> {
  const store = project.assets;
  const requestRoot = project.folder();
  switch (request.operation) {
    case "assets.list": return store.list();
    case "assets.pending": return ok(store.pendingImports());
    case "assets.export-bundle": {
      const root = project.folder();
      if (!root) return err(failure("Open a project first", "no-project"));
      const blender = await readBlenderExecutable();
      return blender.isErr() ? err(blender.error) : exportPortableAssets(root, request.ids, request.includeSources, blender.value);
    }
    case "assets.import-bundle": return importPortableAssets(project, request.attachment);
    case "assets.import-reversible": return importReversibleAssets(project, request.attachment);
    case "assets.undo-import": return undoAssetImport(project, request.id);
    case "assets.preview": return store.preview(request.id, request.revision);
    case "assets.accept": return store.accept(request.id, request.revision);
    case "assets.discard": return store.discard(request.id, request.revision);
    case "assets.undo": return store.undo(request.id);
    case "assets.cancel": return store.cancel(request.id);
    case "assets.configure-blender": {
      const picked = await io(() => dialog.showOpenDialog(window, { title: "Choose Blender application", properties: ["openFile"] }), "Cannot choose Blender");
      if (picked.isErr()) return err(picked.error);
      const selected = picked.value.filePaths[0];
      if (picked.value.canceled || !selected) return err(failure("Blender selection cancelled", "cancelled"));
      const executable = process.platform === "darwin" && selected.endsWith(".app") ? path.join(selected, "Contents", "MacOS", "Blender") : selected;
      return (await atomicWrite(settingsPath(), new TextEncoder().encode(JSON.stringify({ executable })))).map(() => ({ executable }));
    }
    case "assets.import": {
      const picked = await chooseSource(window);
      if (picked.isErr()) return err(picked.error);
      const blender = await readBlenderExecutable();
      if (project.folder() !== requestRoot) return err(failure("Project changed during asset selection", "conflict"));
      return blender.isErr() ? err(blender.error) : store.importSource(request.name, picked.value, request.mode, blender.value, undefined, request.recipe);
    }
    case "assets.import-buffer": return store.importBuffer(request.name, request.bytes, request.sourceAssetId);
    case "assets.reimport": {
      const assets = await store.list();
      if (assets.isErr()) return err(assets.error);
      const asset = assets.value.find((entry) => entry.id === request.id);
      if (!asset) return err(failure("Unknown project asset", "missing"));
      const source = request.relocate ? await chooseSource(window) : await store.source(request.id);
      if (source.isErr()) return err(source.error);
      const blender = await readBlenderExecutable();
      if (project.folder() !== requestRoot) return err(failure("Project changed during asset selection", "conflict"));
      return blender.isErr() ? err(blender.error) : store.importSource(asset.name, source.value, asset.source.mode, blender.value, asset, request.recipe);
    }
    case "assets.duplicate": {
      const blender = await readBlenderExecutable();
      if (project.folder() !== requestRoot) return err(failure("Project changed during asset selection", "conflict"));
      return blender.isErr() ? err(blender.error) : store.duplicate(request.id, request.name, blender.value);
    }
    case "assets.external": return openSource(project, request.id, request.action);
    default: return err(failure("Unsupported asset operation", "invalid"));
  }
}
async function openSource(project: ProjectStore, id: string, action: "open" | "reveal"): Promise<Outcome<unknown, HostError>> {
  const root = project.folder();
  const target = await project.assets.source(id);
  if (target.isErr()) return err(target.error);
  if (project.folder() !== root) return err(failure("Project changed during asset operation", "conflict"));
  if (action === "reveal") return Result.fromThrowable(() => shell.showItemInFolder(target.value), () => failure("Cannot reveal authoring source"))();
  if (path.extname(target.value).toLowerCase() === ".blend") {
    const blender = await readBlenderExecutable();
    if (blender.isErr()) return err(blender.error);
    if (project.folder() !== root) return err(failure("Project changed during asset operation", "conflict"));
    if (!blender.value) return err(failure("Configure Blender before opening this source", "configuration"));
    const started = startProcess(blender.value, ["--disable-autoexec", target.value], path.dirname(target.value));
    if (started.isErr()) return err(started.error);
    return new Promise((resolve) => {
      started.value.stdout?.resume(); started.value.stderr?.resume();
      started.value.once("error", () => resolve(err(failure("Cannot start Blender; configure its application again", "launch"))));
      started.value.once("spawn", () => { started.value.unref(); resolve(ok(undefined)); });
    });
  }
  const opened = await io(() => shell.openPath(target.value), "Cannot open model source");
  return opened.isErr() ? err(opened.error) : opened.value ? err(failure(opened.value)) : ok(undefined);
}
