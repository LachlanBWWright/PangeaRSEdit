import { describe, expect, it } from "vitest";
import { Result } from "neverthrow";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { OttoGlobals } from "@/data/globals/globals";
import { applyGlobalBehavior, createScriptWorkspaceContext, ensureScriptWorkspace, placeCustomObject, upsertScriptSourceFile } from "./scriptWorkspaceState";
import { createObjectDefinition } from "./scriptObjectActions";
import { buildScriptLibrary, readScriptLibrary } from "./scriptLibrary";
import { mergeScriptLibrary, scriptLibraryChanges } from "./scriptLibraryMerge";
import { readIdeLuaFolder } from "./scriptIdeFolder";

const context = createScriptWorkspaceContext(OttoGlobals, 0);
function sourceFile(path: string, content: string): File {
  const file = new File([content], path.split("/").at(-1) ?? "source.lua");
  Object.defineProperty(file, "webkitRelativePath", { value: path });
  Object.defineProperty(file, "text", { value: () => Promise.resolve(content) });
  return file;
}

describe("shared script libraries and IDE updates", () => {
  it("exports a reusable library without level placements or generated output", async () => {
    const created = createObjectDefinition(ensureScriptWorkspace({}, context), "Lantern", "blank");
    if (created.isErr()) { expect.fail(created.error); return; }
    const assigned = applyGlobalBehavior(created.value.state, "onLevelStart", "sample.log-level-start");
    const state = placeCustomObject(assigned, created.value.id, "Lantern", { x: 10, y: 0, z: 20 });
    const bundle = buildScriptLibrary(state);
    if (bundle.isErr()) { expect.fail(bundle.error); return; }
    const unzipped = Result.fromThrowable(() => unzipSync(bundle.value), String)();
    if (unzipped.isErr()) { expect.fail(unzipped.error); return; }
    expect(Object.keys(unzipped.value)).toContain("library.schema.json");
    expect(Object.keys(unzipped.value)).toContain("Data/Scripts/types/pangea.lua");
    expect(Object.keys(unzipped.value).some((path) => /config\/|dist\/|src\/assignments\//.test(path))).toBe(false);
    const imported = await readScriptLibrary(bundle.value, context.gameId);
    if (imported.isErr()) { expect.fail(imported.error); return; }
    expect(imported.value.manifest.objects[0]?.id).toBe(created.value.id);
    expect(imported.value.manifest.behaviors.some((behavior) => behavior.id === "sample.log-level-start")).toBe(true);
    expect(imported.value.manifest).not.toHaveProperty("levels");
    const config = unzipped.value[".luarc.json"];
    expect(config ? strFromU8(config) : "").toContain("Data/Scripts/src/?.lua");
  });

  it("discovers added Lua modules in an edited library and rejects another game", async () => {
    const bundle = buildScriptLibrary(ensureScriptWorkspace({}, context));
    if (bundle.isErr()) { expect.fail(bundle.error); return; }
    const files = Result.fromThrowable(() => unzipSync(bundle.value), String)();
    if (files.isErr()) { expect.fail(files.error); return; }
    files.value["Data/Scripts/src/helpers/new.lua"] = strToU8("return { value = 42 }");
    const edited = Result.fromThrowable(() => zipSync(files.value), String)();
    if (edited.isErr()) { expect.fail(edited.error); return; }
    const imported = await readScriptLibrary(edited.value, context.gameId);
    if (imported.isErr()) { expect.fail(imported.error); return; }
    expect(imported.value.sources["Data/Scripts/src/helpers/new.lua"]).toContain("42");
    expect(imported.value.manifest.moduleOrder).toContain("Data/Scripts/src/helpers/new.lua");
    expect((await readScriptLibrary(edited.value, "Nanosaur-android")).isErr()).toBe(true);
  });

  it("reviews source conflicts and applies changes without replacing levels or unrelated work", async () => {
    const base = applyGlobalBehavior(ensureScriptWorkspace({}, context), "onLevelStart", "sample.log-level-start");
    const local = upsertScriptSourceFile(base, "Data/Scripts/src/shared.lua", "return { version = 1 }");
    const incoming = await readIdeLuaFolder([
      sourceFile("pack/Data/Scripts/src/shared.lua", "return { version = 2 }"),
      sourceFile("pack/Data/Scripts/src/new.lua", "return {}"),
      sourceFile("pack/Data/Scripts/dist/main.lua", "ignored"),
      sourceFile("pack/Data/Scripts/src/main.lua", "ignored"),
    ], context.gameId);
    if (incoming.isErr()) { expect.fail(incoming.error); return; }
    expect(Object.keys(incoming.value.sources)).toHaveLength(2);
    const changes = scriptLibraryChanges(local, incoming.value);
    const defaults = new Set(changes.filter((change) => change.before === null).map((change) => change.key));
    const kept = mergeScriptLibrary(local, incoming.value, defaults);
    if (kept.isErr()) { expect.fail(kept.error); return; }
    expect(kept.value.sourceFiles["Data/Scripts/src/shared.lua"]?.content).toContain("version = 1");
    expect(kept.value.sourceFiles["Data/Scripts/src/new.lua"]).toBeDefined();
    const updated = mergeScriptLibrary(local, incoming.value, new Set(changes.map((change) => change.key)));
    if (updated.isErr()) { expect.fail(updated.error); return; }
    expect(updated.value.sourceFiles["Data/Scripts/src/shared.lua"]?.savedContent).toContain("version = 2");
    expect(updated.value.levels).toBe(local.levels);
    expect(updated.value.activeFilePath).toBe(local.activeFilePath);
  });

  it("rejects a partial object import whose source was deselected", async () => {
    const state = ensureScriptWorkspace({}, context);
    const created = createObjectDefinition(state, "Lantern", "blank");
    if (created.isErr()) { expect.fail(created.error); return; }
    const bundle = buildScriptLibrary(created.value.state);
    if (bundle.isErr()) { expect.fail(bundle.error); return; }
    const library = await readScriptLibrary(bundle.value, context.gameId);
    if (library.isErr()) { expect.fail(library.error); return; }
    expect(mergeScriptLibrary(state, library.value, new Set([`object:${created.value.id}`])).isErr()).toBe(true);
  });

  it("recognizes a bare src folder and rejects mismatched project metadata", async () => {
    const bare = await readIdeLuaFolder([sourceFile("src/helpers/glow.lua", "return {}")], context.gameId);
    expect(bare.isOk() && bare.value.sources["Data/Scripts/src/helpers/glow.lua"]).toBe("return {}");
    const wrong = await readIdeLuaFolder([
      sourceFile("pack/library.json", JSON.stringify({ gameId: "Nanosaur-android" })),
      sourceFile("pack/Data/Scripts/src/user.lua", "return {}"),
    ], context.gameId);
    expect(wrong.isErr()).toBe(true);
  });
});
