import { afterEach, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ok } from "neverthrow";
import type { EditorPreferences, HostError } from "@pangea/desktop-contracts";
import type { Result } from "neverthrow";
import { openProjectExternal } from "../src/projectExternal.ts";
import { readEditorSettings } from "../src/editorSettings.ts";

const host = vi.hoisted(() => ({ openPath: vi.fn(async () => ""), openExternal: vi.fn(async () => undefined), showItemInFolder: vi.fn(), registered: vi.fn(() => "Visual Studio Code") }));
vi.mock("electron", () => ({ shell: host, app: { getApplicationNameForProtocol: host.registered } }));
vi.mock("../src/editorSettings.ts", () => ({ readEditorSettings: vi.fn<() => Promise<Result<EditorPreferences, HostError>>>() }));
let root = "";
afterEach(async () => { vi.clearAllMocks(); if (root) await fs.rm(root, { recursive: true, force: true }); });

it("opens only safe existing project files and rejects traversal, symlinks and executable associations", async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "pangea-external-"));
  await fs.writeFile(path.join(root, "helper.lua"), "return {}");
  await fs.writeFile(path.join(root, "game.exe"), "executable");
  await fs.symlink(path.join(root, "helper.lua"), path.join(root, "link.lua"));
  expect((await openProjectExternal(root, "helper.lua", "open")).isOk()).toBe(true);
  expect(host.openPath).toHaveBeenCalledWith(path.join(root, "helper.lua"));
  expect((await openProjectExternal(root, "../outside.lua", "open")).isErr()).toBe(true);
  expect((await openProjectExternal(root, "link.lua", "open")).isErr()).toBe(true);
  expect((await openProjectExternal(root, "game.exe", "open")).isErr()).toBe(true);
  expect((await openProjectExternal(root, "missing.lua", "open")).isErr()).toBe(true);
  expect((await openProjectExternal(null, undefined, "open")).isErr()).toBe(true);
  expect(host.openPath).toHaveBeenCalledTimes(1);
  expect((await openProjectExternal(root, "game.exe", "reveal")).isOk()).toBe(true);
});

it("encodes the VS Code URI and returns application-association failures", async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "pangea-external-"));
  const name = "source #1.lua";
  await fs.writeFile(path.join(root, name), "return {}");
  expect((await openProjectExternal(root, name, "vscode")).isOk()).toBe(true);
  expect(host.openExternal).toHaveBeenCalledWith(`vscode://file/${root.replaceAll(path.sep, "/")}/source%20%231.lua`);
  host.openPath.mockResolvedValueOnce("No application is associated");
  const result = await openProjectExternal(root, name, "open");
  expect(result.isErr() && result.error.message).toContain("No application");
});

it("uses the preferred editor and source line and reports missing registrations", async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "pangea-external-"));
  await fs.writeFile(path.join(root, "source.lua"), "return {}");
  vi.mocked(readEditorSettings).mockResolvedValue(ok({ editor: "vscodium" }));
  expect((await openProjectExternal(root, "source.lua", "edit", 42)).isOk()).toBe(true);
  expect(host.openExternal).toHaveBeenCalledWith(`vscodium://file/${root.replaceAll(path.sep, "/")}/source.lua:42:1`);
  host.registered.mockReturnValueOnce("");
  const missing = await openProjectExternal(root, "source.lua", "edit", 42);
  expect(missing.isErr() && missing.error.code).toBe("not-installed");
  vi.mocked(readEditorSettings).mockResolvedValue(ok({ editor: "system" }));
  expect((await openProjectExternal(root, "source.lua", "edit", 42)).isOk()).toBe(true);
  expect(host.openPath).toHaveBeenCalledWith(path.join(root, "source.lua"));
});
