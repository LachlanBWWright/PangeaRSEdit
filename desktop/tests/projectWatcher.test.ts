import * as fs from "node:fs/promises";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { ProjectStore } from "../src/projectStore.ts";
import { ProjectWatcher } from "../src/projectWatcher.ts";
import { useTemporaryDirectory, writeFixture } from "./fixtures.ts";
import { io, scanProject, type CachedFile } from "../src/files.ts";
vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return { ...original, readFile: vi.fn(original.readFile) };
});

const root = useTemporaryDirectory();
it("reuses unchanged content hashes and notices replaced files", async () => {
  await writeFixture(root(), "Assets/model.bg3d", new Uint8Array(262144).fill(7));
  const cache = new Map<string, CachedFile>();
  const read = vi.mocked(fs.readFile);
  expect((await scanProject(root(), "", cache)).isOk()).toBe(true);
  const count = read.mock.calls.length;
  expect((await scanProject(root(), "", cache)).isOk()).toBe(true);
  expect(read.mock.calls.length).toBe(count);
  await writeFixture(root(), "Assets/model.bg3d", new Uint8Array(262144).fill(8));
  const changed = await scanProject(root(), "", cache);
  expect(changed.isOk()).toBe(true);
  expect(read.mock.calls.length).toBeGreaterThan(count);
});

it("debounces external changes, detects deletion, and detaches when the project changes", async () => {
  const first = path.join(root(), "first"), second = path.join(root(), "second");
  await io(() => fs.mkdir(first), "Fixture failed"); await io(() => fs.mkdir(second), "Fixture failed");
  const store = new ProjectStore(path.join(root(), "recovery"));
  await store.create(first, "First", "OttoMatic");
  const notify = vi.fn();
  const watcher = new ProjectWatcher(store, notify);
  await vi.waitFor(() => expect(notify).toHaveBeenCalled(), { timeout: 3000 });
  notify.mockClear();
  await writeFixture(first, "external.lua", "first");
  await writeFixture(first, "external.lua", "second");
  await vi.waitFor(() => expect(notify.mock.lastCall?.[0].files.some((file: { path: string }) => file.path === "external.lua")).toBe(true), { timeout: 3000 });
  await io(() => fs.rm(path.join(first, "external.lua")), "Fixture failed");
  await vi.waitFor(() => expect(notify.mock.lastCall?.[0].files.some((file: { path: string }) => file.path === "external.lua")).toBe(false), { timeout: 3000 });
  const level = ".pangea/levels/new/level.ter.rsrc";
  await writeFixture(first, level, new Uint8Array([1, 2, 3]));
  await vi.waitFor(() => expect(notify.mock.lastCall?.[0].files.some((file: { path: string }) => file.path === level)).toBe(true), { timeout: 5000 });
  await io(() => fs.rm(path.join(first, level)), "Fixture failed");
  await vi.waitFor(() => expect(notify.mock.lastCall?.[0].files.some((file: { path: string }) => file.path === level)).toBe(false), { timeout: 5000 });
  await store.create(second, "Second", "Bugdom");
  await vi.waitFor(() => expect(notify.mock.lastCall?.[0].folder).toBe(second), { timeout: 3000 });
  watcher.close();
  const before = notify.mock.calls.length;
  await writeFixture(first, "after-close.lua", "ignored");
  expect(notify.mock.calls.length).toBe(before);
});
