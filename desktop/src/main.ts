import path from "node:path";
import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, session } from "electron";
import { hostRequestSchema } from "@pangea/desktop-contracts";
import { failure, io } from "./files.ts";
import { ProjectStore } from "./projectStore.ts";
import { GameStore } from "./gameStore.ts";
import { handleRequest } from "./hostRequests.ts";
import { APP_ORIGIN, registerRendererProtocol } from "./protocol.ts";

protocol.registerSchemesAsPrivileged([{ scheme: "pangea", privileges: {
  standard: true, secure: true, supportFetchAPI: true, stream: true,
} }]);

let window: BrowserWindow | null = null;
let dirty = false;
let closing = false;

async function start() {
  const ready = await io(() => app.whenReady(), "Electron could not start");
  if (ready.isErr()) { console.error(ready.error.message); app.quit(); return; }
  const root = app.getPath("userData");
  const project = new ProjectStore(path.join(root, "recovery"));
  const games = new GameStore(path.join(root, "games"), (game, received, total) => {
    window?.webContents.send("pangea:transfer", { game, received, total });
  });
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
    if (dirty && ["project.open", "project.create"].includes(parsed.data.operation))
      return { ok: false, error: failure("Save or discard current project edits before changing projects", "dirty") };
    const result = await handleRequest(parsed.data, project, games, owner, (value) => { dirty = value; });
    return result.isOk() ? { ok: true, value: result.value } : { ok: false, error: result.error };
  });
  Menu.setApplicationMenu(null);
  createWindow();
  let checking = false;
  let previousRevision = "";
  const timer = setInterval(async () => {
    if (checking || project.busy() || !project.folder() || !window || window.isDestroyed()) return;
    checking = true;
    const snapshot = await project.inspect();
    if (snapshot.isOk() && snapshot.value.revision !== previousRevision) {
      previousRevision = snapshot.value.revision;
      window?.webContents.send("pangea:project-change", snapshot.value);
    }
    checking = false;
  }, 2500);
  app.on("will-quit", () => clearInterval(timer));
  app.on("activate", () => { if (!window) createWindow(); });
}

function createWindow() {
  const created = new BrowserWindow({ width: 1440, height: 960, minWidth: 900, minHeight: 640,
    title: "Pangea RS Edit", backgroundColor: "#0f172a",
    titleBarStyle: "hidden",
    titleBarOverlay: { color: "#111827", symbolColor: "#cbd5e1", height: 36 },
    trafficLightPosition: { x: 12, y: 11 },
    webPreferences: { preload: path.join(app.getAppPath(), "dist/preload.cjs"),
      nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  window = created;
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
  created.on("close", (event) => {
    if (!dirty || closing) return;
    event.preventDefault();
    void io(() => dialog.showMessageBox(created, { type: "warning", buttons: ["Keep editing", "Close without saving"],
      defaultId: 0, cancelId: 0, message: "Project has unsaved changes", detail: "Recent recovery snapshots are retained. Use Save All to save project files." }), "Cannot show close dialog")
      .map((answer) => { if (answer.response === 1) { closing = true; created.close(); } });
  });
  created.on("closed", () => { window = null; dirty = false; closing = false; });
  void io(() => created.loadURL(`${APP_ORIGIN}/index.html`), "Cannot load editor").mapErr((error) => { console.error(error.message); return error; });
}

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
void start();
