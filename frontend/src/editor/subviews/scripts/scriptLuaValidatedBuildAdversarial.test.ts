// @vitest-environment node
import "../../../../tests/setup/scriptLuaValidation";
import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import {
  buildPreviewScriptFiles,
  buildScriptPackageFiles,
  buildScriptPackageZip,
  compileScriptWorkspaceAsync,
  createScriptWorkspaceContext,
  loadScriptSample,
  upsertScriptSourceFile,
} from "./scriptWorkspaceState";

function sampleWorkspace() {
  return loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
}

describe("validated build and export use the real Lua engine", () => {
  it("builds nested helpers and rejects changed dependencies without reusing previous validation", async () => {
    const initial = sampleWorkspace();
    const definition = initial.customObjects[0];
    expect(definition).toBeDefined();
    if (!definition) return;
    const actor = upsertScriptSourceFile(initial, definition.sourceFilePath,
      `return { ${definition.exportName} = require("helpers.outer") }`);
    const outer = upsertScriptSourceFile(actor, "Data/Scripts/src/helpers/outer.lua",
      'return require("helpers.inner")');
    const ready = upsertScriptSourceFile(outer, "Data/Scripts/src/helpers/inner.lua", "return {}");
    expect((await compileScriptWorkspaceAsync(ready)).isOk()).toBe(true);
    expect((await buildScriptPackageZip(ready)).isOk()).toBe(true);
    const broken = upsertScriptSourceFile(ready, "Data/Scripts/src/helpers/inner.lua", "local value = 1\nreturn )");
    const rebuilt = await compileScriptWorkspaceAsync(broken);
    expect(rebuilt.isErr()).toBe(true);
    if (rebuilt.isErr()) {
      expect(rebuilt.error.diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: "lua.syntax", filePath: "Data/Scripts/src/helpers/inner.lua", line: 2 }),
      ]));
    }
    expect((await buildScriptPackageFiles(broken)).isErr()).toBe(true);
    expect((await buildPreviewScriptFiles(broken)).isErr()).toBe(true);
    expect((await buildScriptPackageZip(broken)).isErr()).toBe(true);
  });

  it.each([
    { name: "missing dependency", source: 'return { VALUE = require("helpers.missing") }', phase: "module" },
    { name: "missing behavior export", source: "return {}", phase: "export" },
    { name: "incorrect callback type", source: "return { VALUE = { onSpawn = false } }", phase: "export" },
    { name: "native mutation during module evaluation", source: "pangea.object.delete({})\nreturn { VALUE = {} }", phase: "module" },
  ])("blocks build and every package/preview output for $name", async ({ source, phase }) => {
    const initial = sampleWorkspace();
    const definition = initial.customObjects[0];
    expect(definition).toBeDefined();
    if (!definition) return;
    const state = upsertScriptSourceFile(initial, definition.sourceFilePath,
      source.replace("VALUE", definition.exportName));
    const result = await compileScriptWorkspaceAsync(state);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.diagnostics.some((finding) => finding.code === `lua.${phase}`)).toBe(true);
    expect((await buildScriptPackageFiles(state)).isErr()).toBe(true);
    expect((await buildPreviewScriptFiles(state)).isErr()).toBe(true);
    expect((await buildScriptPackageZip(state)).isErr()).toBe(true);
  });
});
