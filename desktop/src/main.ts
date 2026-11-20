import path from "node:path";
import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, session } from "electron";
import { hostRequestSchema } from "@pangea/desktop-contracts";
import { failure, io } from "./files.ts";
import { ProjectStore } from "./projectStore.ts";
import { GameStore } from "./gameStore.ts";
import { handleRequest } from "./hostRequests.ts";
import { APP_ORIGIN, registerRendererProtocol } from "./protocol.ts";
import { ProjectWatcher } from "./projectWatcher.ts";
import { PackStore } from "./packStore.ts";
import { readBlenderExecutable } from "./assetRequests.ts";
import { Result } from "neverthrow";
import { EnginePreview } from "./enginePreview.ts";
import { readWindowState, rememberWindowState, type WindowState } from "./windowState.ts";
import { handleWindowFailures } from "./windowFailures.ts";

protocol.registerSchemesAsPrivileged([{ scheme: "pangea", privileges: {
  standard: true, secure: true, supportFetchAPI: true, stream: true,
} }]);

let window: BrowserWindow | null = null;
let dirty = false;
let closing = false;
let closeDialogPending = false;
let quitRequested = false;
let savedWindowState: WindowState | null = null;

async function start() {
  const ready = await io(() => app.whenReady(), "Electron could not start");
  if (ready.isErr()) { console.error(ready.error.message); app.quit(); return; }
  const root = app.getPath("userData");
  savedWindowState = await readWindowState(root);
  const engineName = process.platform === "win32" ? "PangeaSandbox.exe" : "PangeaSandbox";
  const engine = new EnginePreview(app.isPackaged
    ? [path.join(process.resourcesPath, "engine", engineName)]
    : [path.resolve(app.getAppPath(), "../.tmp/pangea-sandbox", engineName),
      path.resolve(app.getAppPath(), "../games/pangea-ports/games/PangeaSandbox/build", engineName)],
  path.join(root, "engine-previews"), path.join(root, "engine-saves"),
  !app.isPackaged && process.env.PANGEA_SANDBOX_NATIVE_TEST === "1", app.isPackaged);
  const project = new ProjectStore(path.join(root, "recovery"));
  project.assets.onProgress((event) => window?.webContents.send("pangea:asset-progress", event));
  const packs = new PackStore(path.join(root, "packs"));
  const games = new GameStore(path.join(root, "games"), (game, received, total) => {
    window?.webContents.send("pangea:transfer", { game, received, total });
  }, (runs) => window?.webContents.send("pangea:game-runs", runs));
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  registerRendererProtocol(app.isPackaged ? path.join(process.resourcesPath, "renderer")
    : path.resolve(app.getAppPath(), "../frontend/dist-desktop"), project, games.assets);
  await games.assets.load();
  await games.load();
  ipcMain.handle("pangea:request", async (event, input: unknown) => {
    const owner = window;
    if (!owner || event.sender !== owner.webContents || event.senderFrame !== owner.webContents.mainFrame
      || !event.senderFrame.url.startsWith(`${APP_ORIGIN}/`)) return { ok: false, error: failure("Untrusted request", "forbidden") };
    const parsed = hostRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: failure("Invalid desktop request", "invalid") };
    if (parsed.data.operation === "host.close") {
      if (dirty) return { ok: false, error: failure("Save or discard edits before closing", "dirty") };
      closing = true;
      setImmediate(() => { if (quitRequested) app.quit(); else if (!owner.isDestroyed()) owner.close(); });
      return { ok: true, value: undefined };
    }
    if (dirty && ["project.open", "project.create", "project.reopen", "project.restore", "project.copy", "packs.import", "packs.export"].includes(parsed.data.operation))
      return { ok: false, error: failure("Save or discard current project edits before changing projects", "dirty") };
    const result = await handleRequest(parsed.data, project, games, owner, (value) => { dirty = value; }, packs, engine);
    return result.isOk() ? { ok: true, value: result.value } : { ok: false, error: result.error };
  });
  Menu.setApplicationMenu(null);
  createWindow();
  const watcher = new ProjectWatcher(project, (snapshot) => {
    if (window && !window.isDestroyed()) window.webContents.send("pangea:project-change", snapshot);
  });
  const assetWatcher = setInterval(() => {
    void readBlenderExecutable().then((result) => { if (result.isOk()) void project.assets.checkSources(result.value); });
  }, 5000);
  let engineStopped = false;
  app.on("will-quit", (event) => {
    if (!engineStopped) {
      event.preventDefault();
      void engine.shutdown().then(() => { engineStopped = true; app.quit(); });
      return;
    }
    watcher.close(); clearInterval(assetWatcher); project.assets.cancel();
  });
  app.on("activate", () => { if (!window) createWindow(); });
}

function createWindow() {
  const created = new BrowserWindow({ width: 1440, height: 960, minWidth: 900, minHeight: 640,
    ...(savedWindowState ? { x: savedWindowState.x, y: savedWindowState.y, width: savedWindowState.width, height: savedWindowState.height } : {}),
    title: "Pangea RS Edit", backgroundColor: "#0f172a",
    titleBarStyle: "hidden",
    titleBarOverlay: { color: "#111827", symbolColor: "#cbd5e1", height: 36 },
    trafficLightPosition: { x: 12, y: 11 },
    webPreferences: { preload: path.join(app.getAppPath(), "dist/preload.cjs"),
      nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  window = created;
  if (savedWindowState) created.setBounds({ x: savedWindowState.x, y: savedWindowState.y, width: savedWindowState.width, height: savedWindowState.height });
  if (savedWindowState?.maximized) created.maximize();
  rememberWindowState(created, app.getPath("userData"), (state) => { savedWindowState = state; });
  handleWindowFailures(created, () => { dirty = false; closing = false; quitRequested = false; });
  created.webContents.on("before-input-event", (event, input) => {
    const modifier = process.platform === "darwin" ? input.meta : input.control;
    if (input.type !== "keyDown" || !modifier || input.alt) return;
    if (input.shift) {
      if (process.platform === "darwin" && input.key.toLowerCase() === "z") {
        event.preventDefault();
        created.webContents.redo();
      }
      return;
    }
    if (process.platform === "darwin") {
      const edit = { a: () => created.webContents.selectAll(), c: () => created.webContents.copy(),
        x: () => created.webContents.cut(), v: () => created.webContents.paste(),
        z: () => created.webContents.undo(), w: () => created.close(), q: () => app.quit(),
      }[input.key.toLowerCase()];
      if (edit) { event.preventDefault(); edit(); return; }
    }
    const command = { n: "new", o: "open", s: "save" }[input.key.toLowerCase()];
    if (!command) return;
    event.preventDefault();
    created.webContents.send("pangea:command", command);
  });
  created.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  created.webContents.on("will-navigate", (event, url) => { if (!url.startsWith(`${APP_ORIGIN}/`)) event.preventDefault(); });
  created.webContents.on("will-prevent-unload", (event) => {
    if (!closing) {
      // Electron suppresses the browser confirmation; this event needs a synchronous decision.
      const answer = Result.fromThrowable(() => dialog.showMessageBoxSync(created, {
        type: "warning", buttons: ["Keep editing", "Close without saving"],
        defaultId: 0, cancelId: 0, noLink: true,
        message: "Close the editor without saving?",
        detail: "A level is open and may have unsaved changes. Save your work before closing to keep your edits.",
      }), () => failure("Cannot show close dialog"))();
      closing = answer.isOk() && answer.value === 1;
      if (!closing) quitRequested = false;
    }
    // Preventing this Electron event permits the unload the renderer blocked.
    if (closing) event.preventDefault();
  });
  created.on("close", (event) => {
    if (!dirty || closing) return;
    event.preventDefault();
    if (closeDialogPending) return;
    closeDialogPending = true;
    void io(() => dialog.showMessageBox(created, { type: "warning", buttons: ["Keep editing", "Close without saving", "Save and close"],
      defaultId: 0, cancelId: 0, message: "Project has unsaved changes", detail: "Recent recovery snapshots are retained. Use Save All to save project files." }), "Cannot show close dialog")
      .then((answer) => {
        closeDialogPending = false;
        if (answer.isOk() && answer.value.response === 2) { created.webContents.send("pangea:command", "close"); return; }
        if (answer.isErr() || answer.value.response !== 1) { quitRequested = false; return; }
        if (created.isDestroyed()) return;
        closing = true;
        if (quitRequested) app.quit();
        else created.close();
      });
  });
  created.on("closed", () => { window = null; dirty = false; closing = false; closeDialogPending = false; });
  void io(() => created.loadURL(`${APP_ORIGIN}/index.html`), "Cannot load editor").mapErr((error) => { console.error(error.message); return error; });
}

app.on("before-quit", () => { quitRequested = true; });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
void start();
