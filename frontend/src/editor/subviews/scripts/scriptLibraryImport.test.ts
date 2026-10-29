import { describe, expect, it, vi } from "vitest";
import { ok } from "neverthrow";
import { OttoGlobals } from "@/data/globals/globals";
import { addScriptAsset, createScriptWorkspaceContext, ensureScriptWorkspace, upsertScriptSourceFile } from "./scriptWorkspaceState";
import { readIdeLuaFolder } from "./scriptIdeFolder";
import { mergeScriptLibrary } from "./scriptLibraryMerge";
import { prepareScriptLibraryImport, type ScriptImportTarget } from "./scriptLibraryImport";

const context = createScriptWorkspaceContext(OttoGlobals, 0);
const sourcePath = "Data/Scripts/src/shared.lua";

async function fixture() {
  const file = new File(["return { version = 2 }"], "shared.lua");
  Object.defineProperty(file, "webkitRelativePath", { value: "src/shared.lua" });
  Object.defineProperty(file, "text", { value: () => Promise.resolve("return { version = 2 }") });
  const library = await readIdeLuaFolder([file], context.gameId);
  const workspace = upsertScriptSourceFile(ensureScriptWorkspace({}, context), sourcePath, "return { version = 1 }");
  const target: ScriptImportTarget = { workspace, projectFolder: "/pack" };
  return { library, target, accepted: new Set([`source:${sourcePath}`]) };
}

function deferredRestore() {
  let finish: () => void = () => undefined;
  const pending = new Promise<void>((resolve) => { finish = resolve; });
  return { finish: () => finish(), restore: vi.fn(async () => { await pending; return ok(undefined); }) };
}

describe("library import restoration races", () => {
  it("merges into the latest state, retaining unrelated edits made while restoration is pending", async () => {
    const { library, target, accepted } = await fixture();
    if (library.isErr()) { expect.fail(library.error); return; }
    let current = target;
    const deferred = deferredRestore();
    const pending = prepareScriptLibraryImport(target, library.value, accepted, () => current, deferred.restore);
    current = { ...target, workspace: upsertScriptSourceFile(target.workspace, "Data/Scripts/src/local.lua", "return { localEdit = true }") };
    deferred.finish();
    expect((await pending).isOk()).toBe(true);
    const merged = mergeScriptLibrary(current.workspace, library.value, accepted);
    expect(merged.isOk() && merged.value.sourceFiles["Data/Scripts/src/local.lua"]?.content).toContain("localEdit");
    expect(merged.isOk() && merged.value.sourceFiles[sourcePath]?.content).toContain("version = 2");
  });

  it("rejects concurrent changes to selected sources", async () => {
    const { library, target, accepted } = await fixture();
    if (library.isErr()) { expect.fail(library.error); return; }
    let current = target;
    const deferred = deferredRestore();
    const pending = prepareScriptLibraryImport(target, library.value, accepted, () => current, deferred.restore);
    current = { ...target, workspace: upsertScriptSourceFile(target.workspace, sourcePath, "return { newerEdit = true }") };
    deferred.finish();
    const result = await pending;
    expect(result.isErr() && result.error).toContain("Selected content changed");
    expect(current.workspace.sourceFiles[sourcePath]?.content).toContain("newerEdit");
  });

  it("detects same-size concurrent asset edits before overwriting them", async () => {
    const { library, target } = await fixture();
    if (library.isErr()) { expect.fail(library.error); return; }
    const path = "Data/Scripts/assets/models/shared.bg3d";
    const before = { ...target, workspace: addScriptAsset(target.workspace, path, new Uint8Array([1]), "shared.bg3d") };
    let current = before;
    const incoming = { ...library.value, assets: { [path]: new Uint8Array([2]) } };
    const deferred = deferredRestore();
    const pending = prepareScriptLibraryImport(before, incoming, new Set([`asset:${path}`]), () => current, deferred.restore);
    current = { ...before, workspace: addScriptAsset(before.workspace, path, new Uint8Array([3]), "shared.bg3d") };
    deferred.finish();
    expect((await pending).isErr()).toBe(true);
    expect(current.workspace.assets[path]?.bytes).toEqual(new Uint8Array([3]));
  });

  it.each(["project", "level"])("rejects a changed active %s during restoration", async (change) => {
    const { library, target, accepted } = await fixture();
    if (library.isErr()) { expect.fail(library.error); return; }
    let current = target;
    const deferred = deferredRestore();
    const pending = prepareScriptLibraryImport(target, library.value, accepted, () => current, deferred.restore);
    current = change === "project" ? { ...target, projectFolder: "/other" }
      : { ...target, workspace: { ...target.workspace, context: { ...context, levelKey: "other" } } };
    deferred.finish();
    expect((await pending).isErr()).toBe(true);
  });
});
