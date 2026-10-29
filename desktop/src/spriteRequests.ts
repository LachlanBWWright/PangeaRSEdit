import * as fs from "node:fs/promises";
import path from "node:path";
import { app, dialog, shell, type BrowserWindow } from "electron";
import { z } from "zod";
import { err, ok, Result, type Result as Outcome } from "neverthrow";
import type { HostError, HostRequest } from "@pangea/desktop-contracts";
import { atomicWrite, failure, io, parseJson, statOrMissing } from "./files.ts";
import { startProcess } from "./processes.ts";
import type { ProjectStore } from "./projectStore.ts";

const settingsSchema = z.object({ executable: z.string().min(1) });
const settingsPath = () => path.join(app.getPath("userData"), "sprite-editor-preferences.json");

async function readSpriteEditor(): Promise<Outcome<string | undefined, HostError>> {
  const info = await statOrMissing(settingsPath());
  if (info.isErr()) return err(info.error);
  if (!info.value) return ok(undefined);
  const text = await io(() => fs.readFile(settingsPath(), "utf8"), "Cannot read sprite editor preferences");
  if (text.isErr()) return err(text.error);
  const json = parseJson(text.value);
  if (json.isErr()) return err(json.error);
  const parsed = settingsSchema.safeParse(json.value);
  return parsed.success ? ok(parsed.data.executable) : err(failure("Invalid sprite editor preferences", "invalid"));
}

export async function handleSpriteRequest(request: HostRequest, project: ProjectStore, window: BrowserWindow): Promise<Outcome<unknown, HostError>> {
  switch (request.operation) {
    case "sprites.list": return project.sprites.list();
    case "sprites.read": return project.sprites.read(request.id);
    case "sprites.commit": return project.sprites.commit(request.id, request.fingerprint, request.revision, request.files, request.frames);
    case "sprites.link": {
      const root = project.folder();
      if (!root) return err(failure("Open a project first", "no-project"));
      const picked = await io(() => dialog.showOpenDialog(window, { title: "Link PNG export and optional JSON animation metadata",
        properties: ["openFile", "multiSelections"], filters: [{ name: "Sprite exports", extensions: ["png", "json"] }] }), "Cannot choose sprite export");
      if (picked.isErr()) return err(picked.error);
      const images = picked.value.filePaths.filter((file) => /\.png$/i.test(file));
      const metadata = picked.value.filePaths.filter((file) => /\.json$/i.test(file));
      if (picked.value.canceled) return err(failure("Sprite source selection cancelled", "cancelled"));
      const image = images[0];
      if (!image || images.length !== 1 || metadata.length > 1 || images.length + metadata.length !== picked.value.filePaths.length)
        return err(failure("Choose one PNG image and at most one JSON metadata file", "invalid"));
      const authoring = await io(() => dialog.showOpenDialog(window, { title: "Optional: choose the original Aseprite document, or cancel to skip",
        properties: ["openFile"], filters: [{ name: "Aseprite document", extensions: ["aseprite", "ase"] }] }), "Cannot choose Aseprite document");
      if (authoring.isErr()) return err(authoring.error);
      const authoringPath = authoring.value.canceled ? null : authoring.value.filePaths[0] ?? null;
      if (root !== project.folder()) return err(failure("Project changed while choosing sprite sources", "conflict"));
      return project.sprites.link(request.name, request.nativePath, request.shapeIndex, image, metadata[0] ?? null, request.mode, authoringPath);
    }
    case "sprites.configure-editor": {
      const picked = await io(() => dialog.showOpenDialog(window, { title: "Choose sprite editor application", properties: ["openFile"] }), "Cannot choose sprite editor");
      if (picked.isErr()) return err(picked.error);
      const executable = picked.value.filePaths[0];
      if (picked.value.canceled || !executable) return err(failure("Sprite editor selection cancelled", "cancelled"));
      return (await atomicWrite(settingsPath(), new TextEncoder().encode(JSON.stringify({ executable })))).map(() => ({ executable }));
    }
    case "sprites.external": return openSpriteSource(project, request.id, request.action);
    default: return err(failure("Unsupported sprite operation", "invalid"));
  }
}

async function openSpriteSource(project: ProjectStore, id: string, action: "open" | "reveal"): Promise<Outcome<void, HostError>> {
  const source = await project.sprites.source(id);
  if (source.isErr()) return err(source.error);
  if (action === "reveal") return Result.fromThrowable(() => shell.showItemInFolder(source.value), () => failure("Cannot reveal sprite source"))();
  const editor = await readSpriteEditor();
  if (editor.isErr()) return err(editor.error);
  if (!editor.value) {
    const opened = await io(() => shell.openPath(source.value), "Cannot open sprite source");
    return opened.isErr() ? err(opened.error) : opened.value ? err(failure(opened.value)) : ok(undefined);
  }
  const executable = process.platform === "darwin" && editor.value.endsWith(".app") ? "/usr/bin/open" : editor.value;
  const args = executable === "/usr/bin/open" ? ["-a", editor.value, source.value] : [source.value];
  const started = startProcess(executable, args, path.dirname(source.value));
  if (started.isErr()) return err(started.error);
  return new Promise((resolve) => {
    started.value.stdout?.resume(); started.value.stderr?.resume();
    started.value.once("error", () => resolve(err(failure("Cannot start sprite editor; choose its application again", "launch"))));
    started.value.once("spawn", () => { started.value.unref(); resolve(ok(undefined)); });
  });
}
