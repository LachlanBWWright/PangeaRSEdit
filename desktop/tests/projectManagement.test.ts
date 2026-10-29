import * as fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, expect, it } from "vitest";
import { ProjectStore } from "../src/projectStore.ts";
import { io } from "../src/files.ts";
import { ProjectHistory } from "../src/projectHistory.ts";

let root = "";
beforeEach(async () => {
  const result = await io(() => fs.mkdtemp(path.join(os.tmpdir(), "pangea-management-")), "Fixture failed");
  expect(result.isOk()).toBe(true);
  if (result.isErr()) return;
  const resolved = await io(() => fs.realpath(result.value), "Cannot resolve fixture directory");
  expect(resolved.isOk()).toBe(true);
  if (resolved.isOk()) root = resolved.value;
});
afterEach(async () => { if (root) await io(() => fs.rm(root, { force: true, recursive: true }), "Cleanup failed"); });

async function create() {
  const folder = path.join(root, "source");
  await io(() => fs.mkdir(folder), "Fixture failed");
  const store = new ProjectStore(path.join(root, "recovery"));
  return { store, created: await store.create(folder, "Original", "MightyMike") };
}

it("persists recent projects and selected levels across host restarts without exposing arbitrary folders", async () => {
  const { store, created } = await create();
  if (created.isErr()) return;
  await store.history.remember(created.value.folder, "Original", "two");
  const restarted = new ProjectStore(path.join(root, "recovery"));
  const recent = await restarted.history.list();
  expect(recent.isOk() && recent.value).toEqual([{ folder: created.value.folder, name: "Original", levelId: "two" }]);
  expect((await restarted.reopen(created.value.folder)).isOk()).toBe(true);
  const forbidden = await restarted.reopen(root);
  expect(forbidden.isErr() && forbidden.error.code).toBe("forbidden");
  const retained = await restarted.history.list();
  expect(retained.isOk() && retained.value[0]?.levelId).toBe("two");
});

it("copies binary assets and hidden level files into an empty folder and switches the active project", async () => {
  const { store, created } = await create();
  if (created.isErr()) return;
  const files = [{ path: ".pangea/levels/one/bindings.json", bytes: new TextEncoder().encode("{}") },
    { path: "Assets/sprites/main.shapes", bytes: new Uint8Array([0, 255, 17]) }];
  const saved = await store.save(created.value.revision, created.value.manifest, files, []);
  if (saved.isErr()) return;
  const destination = path.join(root, "copy");
  await io(() => fs.mkdir(destination), "Fixture failed");
  const copied = await store.copy(destination, saved.value.revision);
  expect(copied.isOk() && copied.value.folder).toBe(destination);
  const read = await store.read(files.map((file) => file.path));
  expect(read.isOk() && read.value).toEqual(files);
  expect(copied.isOk() && copied.value.manifest).toEqual(saved.value.manifest);
  expect(await fs.readFile(path.join(created.value.folder, files[1]?.path ?? ""))).toEqual(Buffer.from([0, 255, 17]));
});

it("rejects stale revisions, nonempty destinations and nested copies without changing the active project", async () => {
  const { store, created } = await create();
  if (created.isErr()) return;
  const destination = path.join(root, "copy");
  await fs.mkdir(destination);
  expect((await store.copy(destination, "stale")).isErr()).toBe(true);
  await fs.writeFile(path.join(destination, "keep.txt"), "keep");
  const nonempty = await store.copy(destination, created.value.revision);
  expect(nonempty.isErr() && nonempty.error.code).toBe("exists");
  expect(await fs.readFile(path.join(destination, "keep.txt"), "utf8")).toBe("keep");
  const nested = path.join(created.value.folder, "nested");
  await fs.mkdir(nested);
  expect((await store.copy(nested, created.value.revision)).isErr()).toBe(true);
  expect(store.folder()).toBe(created.value.folder);
  expect(store.busy()).toBe(false);
});

it("opens and copies through a linked parent using canonical project paths", async () => {
  const actual = path.join(root, "actual");
  const alias = path.join(root, "alias");
  await fs.mkdir(actual);
  await fs.symlink(actual, alias, "junction");
  const source = path.join(alias, "source");
  await fs.mkdir(source);
  const store = new ProjectStore(path.join(root, "recovery"));
  const created = await store.create(source, "Linked project", "OttoMatic");
  expect(created.isOk()).toBe(true);
  if (created.isErr()) return;
  expect(created.value.folder).toBe(path.join(actual, "source"));
  const destination = path.join(alias, "copy");
  await fs.mkdir(destination);
  const copied = await store.copy(destination, created.value.revision);
  expect(copied.isOk()).toBe(true);
  if (copied.isOk()) expect(copied.value.folder).toBe(path.join(actual, "copy"));
});

it("deduplicates and bounds history, recovers corrupt history, and reports missing projects", async () => {
  const history = new ProjectHistory(path.join(root, "history.json"));
  await fs.writeFile(path.join(root, "history.json"), "bad JSON");
  expect((await history.list()).isOk()).toBe(true);
  for (let i = 0; i < 14; i++) await history.remember(`/project/${i}`, `Project ${i}`);
  await history.remember("/project/4", "Renamed");
  const recent = await history.list();
  expect(recent.isOk() && recent.value).toHaveLength(12);
  expect(recent.isOk() && recent.value[0]).toMatchObject({ folder: "/project/4", name: "Renamed" });
  const { store, created } = await create();
  if (created.isErr()) return;
  await fs.rm(created.value.folder, { recursive: true });
  expect((await store.reopen(created.value.folder)).isErr()).toBe(true);
});
