// @vitest-environment node
import { describe, expect, it } from "vitest";
import { validateLuaWorkspaceEngine } from "./scriptLuaValidationEngine";
import type { LuaValidationInput } from "./scriptLuaValidationTypes";

const entryPath = "Data/Scripts/dist/modules/objects/actor.lua";

function workspace(source: string, helpers: Readonly<Record<string, string>> = {}): LuaValidationInput {
  return {
    modules: [
      { path: entryPath, source },
      ...Object.entries(helpers).map(([name, content]) => ({
        path: `Data/Scripts/dist/modules/${name}.lua`, source: content,
      })),
    ],
    behaviors: [{ modulePath: entryPath, exportName: "Actor" }],
  };
}

describe("real Lua 5.4 pre-export validation adversarial cases", () => {
  it("accepts Lua 5.4 constants, close variables, integer division and bit operations", async () => {
    const result = await validateLuaWorkspaceEngine(workspace(`
local mask <const> = (7 << 2) | 1
local resource <close> = setmetatable({}, { __close = function() end })
assert(mask == 29 and 7 // 2 == 3 and (mask & 1) == 1)
return { Actor = { onSpawn = function() end } }
`));
    expect(result.isOk()).toBe(true);
  });

  it("reports the physical source file and line for malformed Lua", async () => {
    const result = await validateLuaWorkspaceEngine(workspace("local value = 1\nlocal broken = )\nreturn { Actor = {} }"));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toEqual(expect.arrayContaining([
        expect.objectContaining({ phase: "syntax", filePath: entryPath, line: 2 }),
      ]));
    }
  });

  it("checks malformed helper modules even if the entry does not require them", async () => {
    const result = await validateLuaWorkspaceEngine(workspace("return { Actor = {} }", {
      "helpers/unused": "local broken = )",
    }));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.some((finding) => finding.filePath === "Data/Scripts/dist/modules/helpers/unused.lua"
        && finding.phase === "syntax")).toBe(true);
    }
  });

  it.each(["nil", "false", "17", '"object"', "function() end"])(
    "rejects a required behavior export containing %s", async (value) => {
      const result = await validateLuaWorkspaceEngine(workspace(`return { Actor = ${value} }`));
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.some((finding) => finding.phase === "export"
          && finding.filePath === entryPath && finding.message.includes("Actor"))).toBe(true);
      }
    },
  );

  it("rejects nonfunction callbacks even when the required behavior table exists", async () => {
    const result = await validateLuaWorkspaceEngine(workspace("return { Actor = { onSpawn = 42 } }"));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.some((finding) => finding.phase === "export"
      && finding.message.includes("Actor.onSpawn"))).toBe(true);
  });

  it("resolves nested local requires and reuses each module's cached value", async () => {
    const result = await validateLuaWorkspaceEngine(workspace(`
local first = require("helpers.outer")
local second = require("helpers.outer")
assert(first == second and first.value == 42)
return { Actor = first }
`, {
      "helpers/outer": 'local inner = require("helpers.inner")\nreturn { value = inner.value + 1 }',
      "helpers/inner": "return { value = 41 }",
    }));
    expect(result.isOk()).toBe(true);
  });

  it("rejects cyclic module dependencies without recursing indefinitely", async () => {
    const result = await validateLuaWorkspaceEngine(workspace('return { Actor = require("helpers.first") }', {
      "helpers/first": 'return require("helpers.second")',
      "helpers/second": 'return require("helpers.first")',
    }));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.some((finding) => /cycl/i.test(finding.message))).toBe(true);
  });

  it("reports missing modules without allowing host filesystem requires", async () => {
    const result = await validateLuaWorkspaceEngine(workspace('local missing = require("helpers.missing")\nreturn { Actor = {} }'));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.some((finding) => finding.message.includes("helpers.missing"))).toBe(true);
  });

  it("rejects top-level native mutation while allowing callbacks to capture native functions", async () => {
    const rejected = await validateLuaWorkspaceEngine(workspace('pangea.object.delete({})\nreturn { Actor = {} }'));
    expect(rejected.isErr()).toBe(true);
    const accepted = await validateLuaWorkspaceEngine(workspace(`
local remove = pangea.object.delete
return { Actor = { onSpawn = function(self) return remove(self.handle) end } }
`));
    expect(accepted.isOk()).toBe(true);
  });

  it("bounds infinite module evaluation with an instruction diagnostic", async () => {
    const result = await validateLuaWorkspaceEngine(workspace("while true do end\nreturn { Actor = {} }"));
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.some((finding) => /budget|instruction|limit/i.test(finding.message))).toBe(true);
  });

  it("bounds module memory allocation and can validate again after exhaustion", async () => {
    const rejected = await validateLuaWorkspaceEngine(workspace(`
local buffer = string.rep("x", 16 * 1024 * 1024)
return { Actor = { buffer = buffer } }
`));
    expect(rejected.isErr()).toBe(true);
    const accepted = await validateLuaWorkspaceEngine(workspace("return { Actor = {} }"));
    expect(accepted.isOk()).toBe(true);
  });

  it("does not leak globals from a failed validation into the next workspace", async () => {
    const rejected = await validateLuaWorkspaceEngine(workspace('_G.validation_poison = 42\nerror("stop")\nreturn { Actor = {} }'));
    expect(rejected.isErr()).toBe(true);
    const accepted = await validateLuaWorkspaceEngine(workspace("assert(validation_poison == nil)\nreturn { Actor = {} }"));
    expect(accepted.isOk()).toBe(true);
  });

  it("rechecks changed source and changed dependencies at the same paths", async () => {
    const source = 'return { Actor = require("helpers.behavior") }';
    const accepted = await validateLuaWorkspaceEngine(workspace(source, { "helpers/behavior": "return {}" }));
    expect(accepted.isOk()).toBe(true);
    const changedHelper = await validateLuaWorkspaceEngine(workspace(source, { "helpers/behavior": "return 4" }));
    expect(changedHelper.isErr()).toBe(true);
    const changedEntry = await validateLuaWorkspaceEngine(workspace("return { Actor = false }", { "helpers/behavior": "return {}" }));
    expect(changedEntry.isErr()).toBe(true);
  });
});
