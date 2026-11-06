// @vitest-environment node
import "../../../../tests/setup/scriptLuaValidation";
import { execFileSync } from "node:child_process";
import { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import {
  buildScriptPackageZip, compileScriptWorkspace, createScriptWorkspaceContext,
  ensureScriptWorkspace, importScriptPackageZip, setScriptSourceExecutionScope,
  upsertScriptSourceFile, loadScriptSample, USER_BOOTSTRAP_PATH,
} from "./scriptWorkspaceState";
import { buildScriptLibrary, readScriptLibrary } from "./scriptLibrary";
import { mergeScriptLibrary, scriptLibraryChanges } from "./scriptLibraryMerge";
import { setCustomPlacementActivation } from "./scriptPlacementActivation";

const path = "Data/Scripts/src/helpers/optional.lua";
const context = createScriptWorkspaceContext(OttoGlobals, 0);
const source = "local p = require('pangea'); return { onFrame = function() p.log.info('helper:frame') end }";
const lua = process.env.PANGEA_LUA_EXECUTABLE;

describe("explicit source execution scope", () => {
  it("does not load newly created helpers until required", () => {
    const state = upsertScriptSourceFile(ensureScriptWorkspace({}, context), path, source);
    expect(state.sourceFiles[path]?.executionScope).toBe("helper");
    expect(state.sourceFiles["Data/Scripts/src/main.lua"]?.content).not.toContain('require("helpers.optional")');
    const enabled = setScriptSourceExecutionScope(state, path, "game");
    expect(enabled.sourceFiles["Data/Scripts/src/main.lua"]?.content).toContain('require("helpers.optional")');
  });

  it("round-trips explicit scope through packages and reusable libraries", async () => {
    const state = upsertScriptSourceFile(ensureScriptWorkspace({}, context), path, source);
    const zip = await buildScriptPackageZip(state);
    expect(zip.isErr() ? zip.error : null).toBeNull();
    if (zip.isErr()) return;
    const imported = importScriptPackageZip(zip.value, context);
    expect(imported.isErr() ? imported.error : null).toBeNull();
    if (imported.isErr()) return;
    expect(imported.value.sourceFiles[path]?.executionScope).toBe("helper");
    const libraryZip = buildScriptLibrary(state);
    expect(libraryZip.isOk()).toBe(true);
    if (libraryZip.isErr()) return;
    const library = await readScriptLibrary(libraryZip.value, context.gameId);
    expect(library.isErr() ? library.error : library.value.manifest.sourceScopes?.[path]).toBe("helper");
    if (library.isErr()) return;
    const gameState = setScriptSourceExecutionScope(state, path, "game");
    expect(scriptLibraryChanges(gameState, library.value).map((change) => change.key)).toContain(`source:${path}`);
    const merged = mergeScriptLibrary(gameState, library.value, new Set([`source:${path}`]));
    expect(merged.isErr() ? merged.error : merged.value.sourceFiles[path]?.executionScope).toBe("helper");
  });

  it("preserves legacy game-wide callbacks when scope metadata is absent", () => {
    const current = upsertScriptSourceFile(ensureScriptWorkspace({}, context), path, source);
    const file = current.sourceFiles[path];
    if (!file) { expect.fail("Missing helper source"); return; }
    const { executionScope: _scope, ...legacyFile } = file;
    expect(_scope).toBe("helper");
    const legacy = compileScriptWorkspace({ ...current, sourceFiles: { ...current.sourceFiles, [path]: legacyFile } });
    expect(legacy.isErr() ? legacy.error : legacy.value.compiledFiles["Data/Scripts/dist/main.lua"]?.content)
      .toContain('require("helpers.optional")');
  });

  it.skipIf(!lua)("executes helpers only on require and dispatches callbacks only after game-wide opt-in", () => {
    if (!lua) return;
    const helperState = upsertScriptSourceFile(ensureScriptWorkspace({}, context), path, source);
    for (const mode of ["helper", "required", "game"]) {
      const state = mode === "game" ? setScriptSourceExecutionScope(helperState, path, "game") : helperState;
      const compiled = compileScriptWorkspace(state);
      expect(compiled.isOk()).toBe(true);
      if (compiled.isErr()) return;
      const preloads = Object.values(compiled.value.sourceFiles).map((file) =>
        `package.preload[${JSON.stringify(file.path.replace("Data/Scripts/src/", "").replace(/\.lua$/, "").replaceAll("/", "."))}] = function()\n${file.path === path ? "calls['helper:init'] = (calls['helper:init'] or 0) + 1" : ""}\n${file.content}\nend`,
      );
      const script = [
        "local calls = {}; package.preload.pangea = function() return { log = { info = function(message) calls[message] = (calls[message] or 0) + 1 end } } end",
        ...preloads,
        "local entry = require('main')",
        mode === "required" ? "require('helpers.optional')" : "",
        "entry.onFrame({ levelNum = 0 })",
        `assert((calls['helper:init'] or 0) == ${mode === "helper" ? 0 : 1})`,
        `assert((calls['helper:frame'] or 0) == ${mode === "game" ? 1 : 0})`,
      ].join("\n");
      const executed = Result.fromThrowable(() => execFileSync(lua, ["-"], { input: script, encoding: "utf8" }), String)();
      expect(executed.isErr() ? executed.error : executed.value).toBe("");
    }
  });

  it.skipIf(!lua)("executes placement activation and cleanup with no game-wide callback modules", () => {
    if (!lua) return;
    const sample = loadScriptSample(context, "hover-beacon");
    const placement = sample.levels[context.levelKey]?.customPlacements[0];
    if (!placement) { expect.fail("Missing sample placement"); return; }
    const withoutGlobal = setScriptSourceExecutionScope(sample, USER_BOOTSTRAP_PATH, "helper");
    const activated = setCustomPlacementActivation(withoutGlobal, placement.id, { kind: "near-player", radius: 100 });
    if (activated.isErr()) { expect.fail(activated.error); return; }
    const compiled = compileScriptWorkspace(activated.value);
    if (compiled.isErr()) { expect.fail(compiled.error); return; }
    const preloads = Object.values(compiled.value.sourceFiles).map((file) =>
      `package.preload[${JSON.stringify(file.path.replace("Data/Scripts/src/", "").replace(/\.lua$/, "").replaceAll("/", "."))}] = function()\n${file.content}\nend`,
    );
    const script = [
      "local spawned, deleted = 0, 0",
      `local position = { x = ${placement.position.x}, y = 0, z = ${placement.position.z} }`,
      "package.preload.pangea = function() return { player = { count = function() return 1 end, get = function() return {position=position} end }, object = { exists = function() return true end, delete = function() deleted=deleted+1; return true end }, spawn = { scripted = function() spawned=spawned+1; return {id=spawned,generation=1} end } } end",
      ...preloads,
      "local entry = require('main')",
      "entry.onLevelStart({levelNum=0}); assert(spawned==1)",
      "position.x=position.x+1000; entry.onFrame({levelNum=0}); assert(deleted==1)",
      "position.x=position.x-1000; entry.onFrame({levelNum=0}); assert(spawned==2)",
      "entry.onLevelUnload({levelNum=0}); assert(deleted==2)",
      "assert(package.loaded.user == nil, 'unused helper loaded eagerly')",
    ].join("\n");
    const executed = Result.fromThrowable(() => execFileSync(lua, ["-"], { input: script, encoding: "utf8" }), String)();
    expect(executed.isErr() ? executed.error : executed.value).toBe("");
  });
});
