import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTemporaryDirectory } from "./fixtures.ts";

interface RequestEvent { sender: object; senderFrame: object | null }
const electron = vi.hoisted(() => {
  const frame = { url: "pangea://editor/index.html" };
  return {
    root: "", frame,
    contents: { mainFrame: frame, on: vi.fn(), setWindowOpenHandler: vi.fn(), send: vi.fn() },
    handle: vi.fn<(channel: string, handler: (event: RequestEvent, input: unknown) => Promise<unknown>) => void>(),
    appOn: vi.fn<(event: string, handler: () => void) => void>(),
    loadURL: vi.fn(async () => undefined),
    permissionRequest: vi.fn<(handler: (contents: unknown, permission: string, callback: (granted: boolean) => void) => void) => void>(),
    permissionCheck: vi.fn<(handler: () => boolean) => void>(),
    openFolder: vi.fn(), windowOptions: vi.fn(), windowOn: vi.fn<(event: string, handler: () => void) => void>(),
  };
});

vi.mock("electron", () => ({
  app: { whenReady: async () => undefined, getPath: () => electron.root, getAppPath: () => electron.root,
    on: electron.appOn, quit: vi.fn(), isPackaged: false },
  BrowserWindow: class {
    webContents = electron.contents;
    loadURL = electron.loadURL;
    on = electron.windowOn;
    isDestroyed = () => false;
    constructor(options: unknown) { electron.windowOptions(options); }
  },
  dialog: { showOpenDialog: electron.openFolder },
  ipcMain: { handle: electron.handle }, Menu: { setApplicationMenu: vi.fn() },
  protocol: { registerSchemesAsPrivileged: vi.fn() },
  session: { defaultSession: { setPermissionRequestHandler: electron.permissionRequest, setPermissionCheckHandler: electron.permissionCheck } },
}));
vi.mock("../src/protocol.ts", () => ({ APP_ORIGIN: "pangea://editor", registerRendererProtocol: vi.fn() }));

const root = useTemporaryDirectory();
beforeEach(async () => {
  vi.resetModules();
  electron.root = root();
  electron.frame.url = "pangea://editor/index.html";
  electron.handle.mockClear();
  electron.appOn.mockClear();
  electron.loadURL.mockClear();
  electron.openFolder.mockClear();
  electron.windowOn.mockClear();
  await import("../src/main.ts");
  await vi.waitFor(() => expect(electron.loadURL).toHaveBeenCalledWith("pangea://editor/index.html"));
});
afterEach(() => { electron.appOn.mock.calls.find(([event]) => event === "will-quit")?.[1](); });

function request(input: unknown, sender: object = electron.contents, frame: object | null = electron.frame) {
  const handler = electron.handle.mock.calls[0]?.[1];
  expect(handler).toBeDefined();
  return handler?.({ sender, senderFrame: frame }, input);
}

describe("actual main-process IPC authorization", () => {
  it("dispatches a valid request from the owning main frame", async () => {
    expect(await request({ operation: "host.info" })).toEqual({ ok: true, value: { platform: process.platform, arch: process.arch } });
  });

  it("rejects requests after the owning window is closed", async () => {
    const closed = electron.windowOn.mock.calls.find(([event]) => event === "closed")?.[1];
    expect(closed).toBeDefined();
    closed?.();
    expect(await request({ operation: "host.info" })).toMatchObject({ ok: false, error: { code: "forbidden" } });
  });

  it.each(["other-window", "child-frame", "missing-frame"])("rejects requests from %s before opening a folder", async (source) => {
    const reply = await request({ operation: "project.open" }, source === "other-window" ? {} : electron.contents,
      source === "missing-frame" ? null : source === "child-frame" ? { url: electron.frame.url } : electron.frame);
    expect(reply).toMatchObject({ ok: false, error: { code: "forbidden" } });
    expect(electron.openFolder).not.toHaveBeenCalled();
  });

  it.each(["https://example.com/", "pangea://editor.evil/index.html", "pangea://editor@evil/index.html", "file:///index.html"])
  ("rejects a main frame navigated to %s", async (url) => {
    electron.frame.url = url;
    expect(await request({ operation: "host.info" })).toMatchObject({ ok: false, error: { code: "forbidden" } });
  });

  it("validates payloads before dispatch and keeps dirty guards intact after a spoofed request", async () => {
    expect(await request({ operation: "shell.execute" })).toMatchObject({ ok: false, error: { code: "invalid" } });
    expect(await request({ operation: "host.dirty", dirty: true })).toMatchObject({ ok: true });
    expect(await request({ operation: "host.dirty", dirty: false }, {})).toMatchObject({ ok: false, error: { code: "forbidden" } });
    for (const operation of ["project.open", "project.create", "project.reopen", "project.restore", "project.copy", "packs.import"]) {
      expect(await request({ operation, id: "a".repeat(64), name: "Guarded", game: "OttoMatic", folder: "/project", revision: "saved" })).toMatchObject({ ok: false, error: { code: "dirty" } });
    }
    expect(electron.openFolder).not.toHaveBeenCalled();
  });

  it("configures renderer isolation, denies new windows, and rejects permissions", () => {
    expect(electron.windowOptions).toHaveBeenLastCalledWith(expect.objectContaining({
      webPreferences: expect.objectContaining({ nodeIntegration: false, contextIsolation: true, sandbox: true }),
    }));
    expect(electron.contents.setWindowOpenHandler.mock.lastCall?.[0]()).toEqual({ action: "deny" });
    const granted = vi.fn();
    electron.permissionRequest.mock.lastCall?.[0]({}, "camera", granted);
    expect(granted).toHaveBeenCalledWith(false);
    expect(electron.permissionCheck.mock.lastCall?.[0]()).toBe(false);
  });
});
