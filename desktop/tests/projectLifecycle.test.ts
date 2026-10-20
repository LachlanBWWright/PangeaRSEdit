import * as fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ProjectStore } from "../src/projectStore.ts";
import { hash, io } from "../src/files.ts";
import { bytes, readFixture, useTemporaryDirectory, writeFixture } from "./fixtures.ts";

const root = useTemporaryDirectory();
const store = () => new ProjectStore(path.join(root(), "recovery"));

describe("project lifecycle failures", () => {
  it("returns typed failures for operations without an open project", async () => {
    const project = store();
    for (const result of [await project.inspect(), await project.read([]), await project.recover()])
      expect(result.isErr() && result.error.code).toBe("no-project");
    expect(project.folder()).toBeNull();
    expect(project.busy()).toBe(false);
  });

  it("never overwrites an existing manifest during creation", async () => {
    const project = store();
    expect((await project.create(root(), "Original", "Bugdom")).isOk()).toBe(true);
    const original = await readFixture(root(), "pangea.project.json");
    const result = await project.create(root(), "Replacement", "Nanosaur");
    expect(result.isErr() && result.error.code).toBe("exists");
    expect(await readFixture(root(), "pangea.project.json")).toBe(original);
  });

  it.each(["not JSON", '{"version":999}', '{"kind":"pangea-editor-project","version":1,"name":"x","game":"Unknown","levels":[]}'])
  ("keeps the current project when another project cannot be opened: %s", async (manifest) => {
    const project = store();
    expect((await project.create(root(), "Current", "Bugdom")).isOk()).toBe(true);
    await writeFixture(root(), "invalid/pangea.project.json", manifest);
    const result = await project.open(path.join(root(), "invalid"));
    expect(result.isErr() && result.error.code).toBe("invalid");
    expect(project.folder()).toBe(root());
    const snapshot = await project.inspect();
    expect(snapshot.isOk() && snapshot.value.manifest.name).toBe("Current");
  });

  it("rejects a game change and allows another save after validation failure", async () => {
    const project = store();
    const created = await project.create(root(), "Game locked", "Bugdom");
    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;
    const result = await project.save(created.value.revision, { ...created.value.manifest, game: "Nanosaur" }, [], []);
    expect(result.isErr() && result.error.code).toBe("invalid");
    expect(project.busy()).toBe(false);
    expect((await project.save(created.value.revision, created.value.manifest, [], [])).isOk()).toBe(true);
  });

  it("serializes saves and refuses opening a different project during a save", async () => {
    const project = store();
    const created = await project.create(root(), "Concurrent", "Bugdom");
    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;
    const saving = project.save(created.value.revision, created.value.manifest, [], []);
    expect(project.busy()).toBe(true);
    const concurrent = await project.save(created.value.revision, created.value.manifest, [], []);
    expect(concurrent.isErr() && concurrent.error.code).toBe("busy");
    const opened = await project.open(root());
    expect(opened.isErr() && opened.error.code).toBe("busy");
    expect((await saving).isOk()).toBe(true);
    expect(project.busy()).toBe(false);
  });

  it("retains recovery after a conflict and clears it only after a successful save", async () => {
    const folder = path.join(root(), "project");
    expect((await io(() => fs.mkdir(folder), "Cannot create fixture")).isOk()).toBe(true);
    const project = store();
    const created = await project.create(folder, "Recovery", "Bugdom");
    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;
    expect((await project.backup(created.value.manifest, [{ path: "user.lua", bytes: bytes("unsaved") }])).isOk()).toBe(true);
    await writeFixture(folder, "external", "outside");
    const conflict = await project.save(created.value.revision, created.value.manifest, [], []);
    expect(conflict.isErr() && conflict.error.code).toBe("conflict");
    const latest = await project.inspect();
    expect(latest.isOk() && latest.value.recoveryAvailable).toBe(true);
    if (latest.isErr()) return;
    const saved = await project.save(latest.value.revision, latest.value.manifest, [], []);
    expect(saved.isOk() && saved.value.recoveryAvailable).toBe(false);
    expect(await readFixture(folder, "external")).toBe("outside");
  });

  it("reports corrupt recovery without modifying project files", async () => {
    const project = store();
    expect((await project.create(root(), "Recovery", "Bugdom")).isOk()).toBe(true);
    const original = await readFixture(root(), "pangea.project.json");
    await writeFixture(root(), `recovery/${hash(root())}.zip`, "invalid zip");
    expect((await project.recover()).isErr()).toBe(true);
    expect(await readFixture(root(), "pangea.project.json")).toBe(original);
  });
});
