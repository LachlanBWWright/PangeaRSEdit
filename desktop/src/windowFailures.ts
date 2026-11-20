import * as fs from "node:fs/promises";
import { dialog, type BrowserWindow } from "electron";
import { io } from "./files.ts";

export function handleWindowFailures(window: BrowserWindow, prepareReload: () => void) {
  let showing = false;
  async function report(reason: string) {
    if (showing || window.isDestroyed()) return;
    showing = true;
    const answer = await io(() => dialog.showMessageBox(window, {
      type: "error", title: "Editor needs attention", message: "The editor could not continue.",
      detail: `${reason}\nReload reopens your saved project. Available recovery snapshots can restore recent unsaved work.`,
      buttons: ["Keep window open", "Reload editor", "Export diagnostics…"], defaultId: 1, cancelId: 0,
    }), "Cannot show editor failure");
    showing = false;
    if (answer.isErr() || window.isDestroyed()) return;
    if (answer.value.response === 1) { prepareReload(); window.webContents.reload(); }
    if (answer.value.response === 2) {
      const destination = await io(() => dialog.showSaveDialog(window, {
        title: "Export editor diagnostics", defaultPath: "pangea-editor-diagnostics.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
      }), "Cannot choose diagnostics destination");
      if (destination.isErr() || destination.value.canceled || !destination.value.filePath) return;
      const diagnostics = { time: new Date().toISOString(), platform: process.platform, arch: process.arch,
        electron: process.versions.electron, reason };
      const written = await io(() => fs.writeFile(destination.value.filePath ?? "", JSON.stringify(diagnostics, null, 2)), "Cannot export diagnostics");
      if (written.isErr()) await io(() => dialog.showMessageBox(window, { type: "error", message: written.error.message }), "Cannot show export error");
    }
  }
  window.webContents.on("render-process-gone", (_event, details) => void report(`Renderer stopped: ${details.reason} (exit ${details.exitCode}).`));
  window.on("unresponsive", () => void report("The editor stopped responding."));
  window.webContents.on("did-fail-load", (_event, code, _description, _url, mainFrame) => {
    if (mainFrame && code !== -3) void report(`The editor page failed to load (error ${code}).`);
  });
}
