import * as fs from "node:fs/promises";
import path from "node:path";
import { app, dialog, type BrowserWindow } from "electron";
import { err, ok, type Result } from "neverthrow";
import { editorPreferencesSchema, type EditorPreferences, type HostError } from "@pangea/desktop-contracts";
import { atomicWrite, failure, io, parseJson, statOrMissing } from "./files.ts";

export function editorSettingsPath() { return path.join(app.getPath("userData"), "editor-preferences.json"); }

export async function readEditorSettings(): Promise<Result<EditorPreferences, HostError>> {
  const info = await statOrMissing(editorSettingsPath());
  if (info.isErr()) return err(info.error);
  if (!info.value) return ok({ editor: "system" });
  const text = await io(() => fs.readFile(editorSettingsPath(), "utf8"), "Cannot read editor preferences");
  if (text.isErr()) return err(text.error);
  const json = parseJson(text.value);
  if (json.isErr()) return err(json.error);
  const parsed = editorPreferencesSchema.safeParse(json.value);
  return parsed.success ? ok(parsed.data) : err(failure("Invalid editor preferences", "invalid"));
}

export async function configureEditor(window: BrowserWindow, editor: EditorPreferences["editor"]): Promise<Result<EditorPreferences, HostError>> {
  let executable: string | undefined;
  if (editor === "custom") {
    const chosen = await io(() => dialog.showOpenDialog(window, { title: "Choose a trusted external editor application", properties: ["openFile"] }), "Cannot choose editor");
    if (chosen.isErr()) return err(chosen.error);
    executable = chosen.value.filePaths[0];
    if (chosen.value.canceled || !executable) return err(failure("Editor selection cancelled", "cancelled"));
  }
  const settings: EditorPreferences = { editor, executable };
  const saved = await atomicWrite(editorSettingsPath(), new TextEncoder().encode(JSON.stringify(settings)));
  return saved.isErr() ? err(saved.error) : ok(settings);
}
