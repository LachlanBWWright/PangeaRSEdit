// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NanosaurGlobals } from "@/data/globals/globals";
import { createObjectDefinition } from "./scriptObjectActions";
import { aliasSourceExport, duplicateScriptObject } from "./scriptObjectDuplication";
import { addObjectHandler } from "./scriptObjectHandlers";
import { objectLuaLayout } from "./scriptObjectLuaLayout";
import { createScriptWorkspaceContext, ensureScriptWorkspace, updateScriptSourceContent } from "./scriptWorkspaceState";
import { validateLuaWorkspaceEngine } from "./scriptLuaValidationEngine";

describe("object callback editing", () => {
  it.each([
    'local object = {}\n-- object.onDestroy\nlocal text = "object.onDestroy"\n--[=[ function object.onDestroy() end ]=]\nreturn { test = object }',
    'return { test = { onUpdate = function() local onDestroy = 1 end } }',
    'local object = {}\nfunction other() local object = {} function object.onDestroy() end end\nreturn { test = object }',
  ])("ignores comments, strings and callback-local assignments", (source) => {
    const layout = objectLuaLayout(source, "test");
    expect(layout.isOk()).toBe(true);
    if (layout.isOk()) expect(layout.value.handlers.has("onDestroy")).toBe(false);
  });

  it.each([
    'local object = {}\nfunction object.onDestroy(self, ctx) end\nreturn { test = object }',
    'local object = {}\nobject["onDestroy"] = function(self, ctx) end\nreturn { ["test"] = object }',
    'return { test = { ["onDestroy"] = function(self, ctx) end } }',
    'return { test = { onDestroy = function(self, ctx) end } }',
    'local object = {} local alias = object function alias.onDestroy(self, ctx) end local exports = { test = object } return exports',
    'local function destroy(self, ctx) end local callback = destroy local behavior = { onDestroy = callback } local exports = {} exports.test = behavior return exports',
  ])("detects existing declarations and assigned handlers", (source) => {
    const layout = objectLuaLayout(source, "test");
    expect(layout.isOk()).toBe(true);
    if (layout.isOk()) expect(layout.value.handlers.has("onDestroy")).toBe(true);
  });

  it.each([
    'local behavior = {} local exports = { test = behavior } return exports',
    'local behavior = {} local alias = behavior local exports = { test = alias } local result = exports return result',
    'local behavior = {} local exports = {} exports.test = behavior return exports',
    'local behavior = {} local exports = {} local output = exports output["test"] = behavior return output',
    'local exports = {} exports.test = { onUpdate = function(self, ctx) end } return exports',
    'local behavior = {} local old = behavior local exports = { test = behavior } behavior = {} return exports',
    'local behavior = {} do local behavior = { onDestroy = function() end } end local exports = { test = behavior } return exports',
    'local behavior = { onDestroy = function() end } behavior.onDestroy = nil local exports = { test = behavior } return exports',
    'local behavior = { onDestroy = nil } local exports = { test = behavior } return exports',
  ])("adds callbacks to statically resolved export layouts and compiles them in Lua", async (body) => {
    const created = createObjectDefinition(ensureScriptWorkspace({}, createScriptWorkspaceContext(NanosaurGlobals, 0)), "Aliases", "blank");
    if (created.isErr()) { expect.fail(created.error); return; }
    const definition = created.value.state.customObjects[0];
    if (!definition) { expect.fail("Missing object"); return; }
    const source = body.replaceAll("test", definition.exportName);
    const state = updateScriptSourceContent(created.value.state, definition.sourceFilePath, source);
    const added = addObjectHandler(state, definition, "onDestroy");
    if (added.isErr()) { expect.fail(`${body}: ${added.error}`); return; }
    expect(added.value).not.toBe(state);
    const content = added.value.sourceFiles[definition.sourceFilePath]?.content ?? "";
    const again = addObjectHandler(added.value, definition, "onDestroy");
    expect(again.isOk()).toBe(true);
    if (again.isOk()) expect(again.value).toBe(added.value);
    const checked = `local exported = (function()\n${content}\nend)()\nassert(type(exported.${definition.exportName}.onDestroy) == "function")\nexported.${definition.exportName}.onDestroy({}, {})\nreturn exported`;
    const valid = await validateLuaWorkspaceEngine({ modules: [{ path: definition.sourceFilePath, source: checked }], behaviors: [{ modulePath: definition.sourceFilePath, exportName: definition.exportName }] });
    expect(valid.isOk(), valid.isErr() ? JSON.stringify(valid.error) : "").toBe(true);
  });

  it.each([
    'local behavior = {} local exports = {} exports[chooseName()] = behavior return exports',
    'local behavior = {} local exports = { test = behavior } if enabled then exports.test = {} end return exports',
    'local behavior = {} if enabled then behavior.onDestroy = function() end end return { test = behavior }',
    'local behavior = {} behavior[chooseName()] = function() end return { test = behavior }',
    'local behavior = {} return { test = behavior or {} }',
    'local behavior = {} local exports = { test = behavior } exports = decorate(exports) return exports',
    'local behavior = { onDestroy = makeCallback() } return { test = behavior }',
    'local behavior = { onDestroy = function() end and nil } return { test = behavior }',
    'local behavior = { onDestroy = nil or function() end } return { test = behavior }',
    'local callback = function() end if enabled then callback = nil end local behavior = { onDestroy = callback } return { test = behavior }',
    'local behavior = {} local exports = { test = behavior } return exports.other',
    'local behavior = {} local exports = { test = behavior } return exports or {}',
    'local behavior = {} if enabled then behavior = {} end return { test = behavior }',
    'local behavior = {} local other = {} behavior, other = other, behavior return { test = behavior }',
  ])("refuses ambiguous exports or callbacks without changing source", (source) => {
    const layout = objectLuaLayout(source, "test");
    expect(layout.isErr()).toBe(true);
    if (layout.isErr()) expect(layout.error).toContain("Lua source");
  });

  it("adds and compiles callbacks after repeated duplication and import aliases", async () => {
    const initial = ensureScriptWorkspace({}, createScriptWorkspaceContext(NanosaurGlobals, 0));
    const created = createObjectDefinition(initial, "Beacon", "blank");
    if (created.isErr()) { expect.fail(created.error); return; }
    let state = created.value.state;
    let id = created.value.id;
    for (let i = 0; i < 3; i++) {
      const duplicate = duplicateScriptObject(state, id);
      if (duplicate.isErr()) { expect.fail(duplicate.error); return; }
      state = duplicate.value.state;
      id = duplicate.value.id;
    }
    const definition = state.customObjects.find((entry) => entry.id === id);
    if (!definition) { expect.fail("Missing copied definition"); return; }
    const source = state.sourceFiles[definition.sourceFilePath]?.content ?? "";
    const imported = { ...definition, exportName: "importedé" };
    state = updateScriptSourceContent(state, definition.sourceFilePath, aliasSourceExport(source, definition.exportName, imported.exportName));
    const added = addObjectHandler(state, imported, "onDestroy");
    if (added.isErr()) { expect.fail(added.error); return; }
    const content = added.value.sourceFiles[definition.sourceFilePath]?.content ?? "";
    expect(content).toContain("function object.onDestroy(self, ctx)");
    expect(content).toContain("---@param ctx ObjectFrameContext");
    const again = addObjectHandler(added.value, imported, "onDestroy");
    if (again.isErr()) { expect.fail(again.error); return; }
    expect(again.value).toBe(added.value);
    const valid = await validateLuaWorkspaceEngine({ modules: [{ path: definition.sourceFilePath, source: content }], behaviors: [{ modulePath: definition.sourceFilePath, exportName: imported.exportName }] });
    expect(valid.isOk(), valid.isErr() ? JSON.stringify(valid.error) : "").toBe(true);
  });

  it("inserts inline callbacks without rewriting the existing body", async () => {
    const created = createObjectDefinition(ensureScriptWorkspace({}, createScriptWorkspaceContext(NanosaurGlobals, 0)), "Inline", "blank");
    if (created.isErr()) { expect.fail(created.error); return; }
    const definition = created.value.state.customObjects[0];
    if (!definition) { expect.fail("Missing object"); return; }
    const original = `return { ${definition.exportName} = { onUpdate = function(self, ctx) end; } }`;
    const state = updateScriptSourceContent(created.value.state, definition.sourceFilePath, original);
    const added = addObjectHandler(state, definition, "onDestroy");
    if (added.isErr()) { expect.fail(added.error); return; }
    const source = added.value.sourceFiles[definition.sourceFilePath]?.content ?? "";
    expect(source).toContain("onUpdate = function(self, ctx) end;");
    const valid = await validateLuaWorkspaceEngine({ modules: [{ path: definition.sourceFilePath, source }], behaviors: [{ modulePath: definition.sourceFilePath, exportName: definition.exportName }] });
    expect(valid.isOk(), valid.isErr() ? JSON.stringify(valid.error) : "").toBe(true);
  });

  it("keeps unsupported layouts unchanged and explains the manual action", () => {
    expect(objectLuaLayout('return require("custom")', "test").isErr()).toBe(true);
    expect(objectLuaLayout('local object = {} return { test = object.child }', "test").isErr()).toBe(true);
    expect(objectLuaLayout('local function unused() local object = {} return { test = object } end return require("custom")', "test").isErr()).toBe(true);
  });
});
