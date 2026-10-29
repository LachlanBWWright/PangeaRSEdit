import { afterEach, expect, it } from "vitest";
import type { HostRequest, ProjectFile, ProjectSnapshot } from "@pangea/desktop-contracts";
import { changeProjectLevel } from "./projectManagement";
import { mergeExternalSources } from "./mergeExternalSources";
import { OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, ensureScriptWorkspace, upsertScriptSourceFile } from "@/editor/subviews/scripts/scriptWorkspaceState";

const previous = window.pangeaDesktop;
afterEach(() => { window.pangeaDesktop = previous; });
function project(): ProjectSnapshot {
  return { folder: "/project", revision: "initial", recoveryAvailable: false, files: [],
    manifest: { kind: "pangea-editor-project", version: 1, name: "Pack", game: "OttoMatic", levels: [
      { id: "one", name: "First", baseLevel: 0, primary: ".pangea/levels/one/level.ter.rsrc", files: [".pangea/levels/one/level.ter.rsrc", ".pangea/levels/one/bindings.json"] },
      { id: "two", name: "Second", baseLevel: 1, primary: ".pangea/levels/two/level.ter.rsrc", files: [".pangea/levels/two/level.ter.rsrc"] },
    ] } };
}
function bridge(snapshot: ProjectSnapshot, disk: ProjectFile[] = []) {
  const writes: Extract<HostRequest, { operation: "project.save" }>[] = [];
  window.pangeaDesktop = { onProjectChange: () => () => undefined, onTransfer: () => () => undefined,
    request: async (request) => {
      if (request.operation === "project.read") return { ok: true, value: disk.filter((file) => request.paths.includes(file.path)) };
      if (request.operation === "project.inspect") return { ok: true, value: snapshot };
      if (request.operation === "project.save") { writes.push(request); return { ok: true, value: { ...snapshot, revision: "saved", manifest: request.manifest } }; }
      return { ok: false, error: { code: "test", message: "Unexpected operation" } };
    } };
  return writes;
}

it("renames and reorders levels without rewriting their contents", async () => {
  const snapshot = project();
  const writes = bridge(snapshot);
  const renamed = await changeProjectLevel(snapshot, "one", "rename", "  New name  ");
  expect(renamed.isOk() && renamed.value.manifest.levels[0]?.name).toBe("New name");
  expect(writes[0]?.files).toEqual([]);
  const moved = await changeProjectLevel(snapshot, "one", "down", "");
  expect(moved.isOk() && moved.value.manifest.levels.map((level) => level.id)).toEqual(["two", "one"]);
  expect((await changeProjectLevel(snapshot, "one", "rename", " ")).isErr()).toBe(true);
});

it("duplicates native files and per-level bindings under independent paths", async () => {
  const snapshot = project();
  const first = snapshot.manifest.levels[0];
  if (!first) return;
  const disk = first.files.map((path) => ({ path, bytes: new Uint8Array([1, 2, 255]) }));
  const writes = bridge(snapshot, disk);
  const result = await changeProjectLevel(snapshot, "one", "duplicate", "");
  expect(result.isOk()).toBe(true);
  if (result.isErr()) return;
  const copy = result.value.manifest.levels[1];
  expect(copy?.id).not.toBe("one");
  expect(copy?.files).toContain(`.pangea/levels/${copy?.id}/bindings.json`);
  expect(copy?.primary).not.toBe(first.primary);
  expect(writes[0]?.files.map((file) => file.bytes)).toEqual(disk.map((file) => file.bytes));
  expect(writes[0]?.removed).toEqual([]);
});

it("deletes only unshared level files, preserving shared source and other levels", async () => {
  const snapshot = project();
  const first = snapshot.manifest.levels[0], second = snapshot.manifest.levels[1];
  if (!first || !second) return;
  first.files.push("Data/Scripts/src/shared.lua");
  second.files.push("Data/Scripts/src/shared.lua");
  const writes = bridge(snapshot);
  await changeProjectLevel(snapshot, "one", "delete", "");
  expect(writes[0]?.removed).toEqual([".pangea/levels/one/level.ter.rsrc", ".pangea/levels/one/bindings.json"]);
  expect(writes[0]?.manifest.levels.map((level) => level.id)).toEqual(["two"]);
});

it("copies scoped asset assignments and removes deleted scopes without making them global", async () => {
  const snapshot = project();
  snapshot.manifest.assetBindings = [
    { source: "Assets/a.tga", target: "Data/Images/a.tga", levels: ["one"] },
    { source: "Assets/b.tga", target: "Data/Images/b.tga", levels: [] },
    { source: "Assets/c.tga", target: "Data/Images/c.tga", levels: ["one", "two"] },
  ];
  const writes = bridge(snapshot);
  const copied = await changeProjectLevel(snapshot, "one", "duplicate", "");
  expect(copied.isOk()).toBe(true);
  if (copied.isErr()) return;
  const copyId = copied.value.manifest.levels[1]?.id;
  expect(copied.value.manifest.assetBindings?.[0]?.levels).toEqual(["one", copyId]);
  await changeProjectLevel(snapshot, "one", "delete", "");
  expect(writes[1]?.manifest.assetBindings).toEqual([
    { source: "Assets/b.tga", target: "Data/Images/b.tga", levels: [] },
    { source: "Assets/c.tga", target: "Data/Images/c.tga", levels: ["two"] },
  ]);
});

it("merges chosen disk sources and recompiles while retaining local source and level edits", async () => {
  const snapshot = project();
  const path = "Data/Scripts/src/helpers/external.lua", retained = "Data/Scripts/src/helpers/local.lua";
  const content = "return { value = 42 }";
  snapshot.files = [{ path, hash: "new", size: content.length }];
  bridge(snapshot, [{ path, bytes: Uint8Array.from(new TextEncoder().encode(content)) }]);
  let workspace = ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0));
  workspace = upsertScriptSourceFile(workspace, path, "return { value = 1 }");
  workspace = upsertScriptSourceFile(workspace, retained, "return { unsaved = true }");
  const result = await mergeExternalSources(workspace, snapshot, [path]);
  expect(result.isErr() ? result.error : null).toBeNull();
  if (result.isErr()) return;
  expect(result.value.sourceFiles[path]?.content).toBe(content);
  expect(result.value.sourceFiles[retained]?.content).toBe("return { unsaved = true }");
  expect(result.value.levels).toEqual(workspace.levels);
  expect(Object.keys(result.value.compiledFiles).length).toBeGreaterThan(0);
  expect((await mergeExternalSources(workspace, { ...snapshot, revision: "stale" }, [path])).isErr()).toBe(true);
  expect((await mergeExternalSources(workspace, snapshot, ["Data/Scripts/config/project.json"])).isErr()).toBe(true);
});
