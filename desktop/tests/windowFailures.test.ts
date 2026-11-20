import { EventEmitter } from "node:events";
import { BrowserWindow } from "electron";
import { beforeEach, expect, it, vi } from "vitest";
import { handleWindowFailures } from "../src/windowFailures.ts";

const boundary = vi.hoisted(() => ({
  showMessageBox: vi.fn(async () => ({ response: 1, checkboxChecked: false })),
  reload: vi.fn(),
}));
vi.mock("electron", () => ({
  BrowserWindow: class extends EventEmitter {
    webContents = Object.assign(new EventEmitter(), { reload: boundary.reload });
    isDestroyed() { return false; }
  },
  dialog: { showMessageBox: boundary.showMessageBox },
}));
beforeEach(() => vi.clearAllMocks());

it("offers recovery guidance after a renderer crash and resets host state before reloading", async () => {
  const window = new BrowserWindow();
  const prepare = vi.fn(() => expect(boundary.reload).not.toHaveBeenCalled());
  handleWindowFailures(window, prepare);
  window.webContents.emit("render-process-gone", {}, { reason: "crashed", exitCode: 7 });
  await vi.waitFor(() => expect(boundary.reload).toHaveBeenCalledOnce());
  expect(prepare).toHaveBeenCalledOnce();
  expect(boundary.showMessageBox).toHaveBeenCalledWith(window, expect.objectContaining({
    detail: expect.stringContaining("recovery snapshots"),
  }));
});

it("ignores cancelled or subframe loads and reports main-frame failures", async () => {
  const window = new BrowserWindow();
  handleWindowFailures(window, vi.fn());
  window.webContents.emit("did-fail-load", {}, -3, "cancelled", "", true);
  window.webContents.emit("did-fail-load", {}, -6, "missing", "", false);
  expect(boundary.showMessageBox).not.toHaveBeenCalled();
  window.webContents.emit("did-fail-load", {}, -6, "missing", "", true);
  await vi.waitFor(() => expect(boundary.reload).toHaveBeenCalledOnce());
});
