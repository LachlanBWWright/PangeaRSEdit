import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { ProjectStore } from "../src/projectStore.ts";
import { io } from "../src/files.ts";
import { recoverInterruptedSave } from "../src/projectTransaction.ts";
import { relativePathSchema } from "@pangea/desktop-contracts";

let root = "";
beforeEach(async () => {
  const created = await io(() => fs.mkdtemp(path.join(os.tmpdir(), "pangea-project-test-")), "Fixture failed");
  expect(created.isOk()).toBe(true);
  if (created.isOk()) root = created.value;
});
afterEach(async () => { if (root) await io(() => fs.rm(root, { recursive: true, force: true }), "Fixture cleanup failed"); });
const bytes = (text: string) => new TextEncoder().encode(text);

describe("project folders", () => {
  it("saves and reopens multiple levels, source Lua, and binary custom assets", async () => {
    const store = new ProjectStore(path.join(root, "recovery"));
    const folder = path.join(root, "project");
    await io(() => fs.mkdir(folder), "Fixture failed");
    const created = await store.create(folder, "Test project", "OttoMatic");
    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;
    const manifest = { ...created.value.manifest, levels: [
      { id: "one", name: "Custom one", baseLevel: 0, primary: ".pangea/levels/one/level.ter.rsrc", files: [".pangea/levels/one/level.ter.rsrc"] },
      { id: "two", name: "Custom two", baseLevel: 1, primary: ".pangea/levels/two/level.ter.rsrc", files: [".pangea/levels/two/level.ter.rsrc"] },
    ] };
    const files = [
      { path: "Data/Scripts/src/user.lua", bytes: bytes("return {}") },
      { path: "Data/Scripts/assets/models/custom.bg3d", bytes: new Uint8Array([0, 255, 128]) },
      ...manifest.levels.map((level) => ({ path: level.primary, bytes: bytes(level.name) })),
    ];
    const saved = await store.save(created.value.revision, manifest, files, []);
    expect(saved.isOk()).toBe(true);
    const reopened = await new ProjectStore(path.join(root, "recovery")).open(folder);
    expect(reopened.isOk() && reopened.value.manifest.levels).toEqual(manifest.levels);
    const read = await store.read(files.map((file) => file.path));
    expect(read.isOk() && read.value).toEqual(files);
  });

  it("refuses a stale save after an external edit or deletion", async () => {
    const store = new ProjectStore(path.join(root, "recovery"));
    const created = await store.create(root, "Conflict", "Bugdom");
    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;
    await io(() => fs.writeFile(path.join(root, "external.lua"), "outside"), "Fixture failed");
    const saved = await store.save(created.value.revision, created.value.manifest, [], []);
    expect(saved.isErr() && saved.error.code).toBe("conflict");
    const snapshot = await store.inspect();
    if (snapshot.isErr()) return;
    await io(() => fs.rm(path.join(root, "external.lua")), "Fixture failed");
    const deleted = await store.save(snapshot.value.revision, snapshot.value.manifest, [], []);
    expect(deleted.isErr() && deleted.error.code).toBe("conflict");
  });

  it("stores recovery outside the project and restores its exact bytes", async () => {
    const recovery = path.join(root, "recovery");
    const folder = path.join(root, "project");
    await io(() => fs.mkdir(folder), "Fixture failed");
    const store = new ProjectStore(recovery);
    const created = await store.create(folder, "Recovery", "Nanosaur");
    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;
    const files = [{ path: "Data/Scripts/src/user.lua", bytes: bytes("unsaved") }];
    expect((await store.backup(created.value.manifest, files)).isOk()).toBe(true);
    expect((await store.read([files[0]?.path ?? "missing"])).isErr()).toBe(true);
    const read = await store.recover();
    expect(read.isOk() && read.value.find((file) => file.path === files[0]?.path)).toEqual(files[0]);
    expect((await store.discardRecovery()).isOk()).toBe(true);
    const snapshot = await store.inspect();
    expect(snapshot.isOk() && snapshot.value.revision).toBe(created.value.revision);
  });

  it("does not follow project symlinks or accept traversal paths", async () => {
    for (const unsafe of ["../escape", "/absolute", "Data/../escape", "C:/Windows/file", "Data\\escape", ".git/config", "Data/CON", "Data/file.", "Data/file?.lua", "Data/file*.lua"])
      expect(relativePathSchema.safeParse(unsafe).success).toBe(false);
    const folder = path.join(root, "project");
    await io(() => fs.mkdir(folder), "Fixture failed");
    const store = new ProjectStore(path.join(root, "recovery"));
    const created = await store.create(folder, "Paths", "Bugdom2");
    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;
    const link = await io(() => fs.symlink(root, path.join(folder, "outside"), "junction"), "Symlink fixture failed");
    expect(link.isOk()).toBe(true);
    expect((await store.read(["outside/pangea.project.json"])).isErr()).toBe(true);
    const result = await store.save(created.value.revision, created.value.manifest, [{ path: "outside/escaped", bytes: bytes("bad") }], []);
    expect(result.isErr()).toBe(true);
  });

  it("recovers an interrupted multi-file save before reopening", async () => {
    const store = new ProjectStore(path.join(root, "recovery"));
    const created = await store.create(root, "Journal", "Bugdom");
    expect(created.isOk()).toBe(true);
    await io(() => fs.mkdir(path.join(root, ".pangea")), "Fixture failed");
    await io(() => fs.writeFile(path.join(root, "level.ter"), "partial"), "Fixture failed");
    await io(() => fs.writeFile(path.join(root, ".pangea/transaction.json"), JSON.stringify([
      { path: "level.ter", bytes: Buffer.from("original").toString("base64") },
      { path: "new-file", bytes: null },
    ])), "Fixture failed");
    expect((await recoverInterruptedSave(root)).isOk()).toBe(true);
    const read = await io(() => fs.readFile(path.join(root, "level.ter"), "utf8"), "Cannot read restored fixture");
    expect(read.isOk() && read.value).toBe("original");
  });
});
