import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { compileScriptWorkspace, createScriptWorkspaceContext, ensureScriptWorkspace } from "./scriptWorkspaceState";

const lua = process.env.PANGEA_LUA_EXECUTABLE;

describe.skipIf(!lua)("generated weapon dispatcher execution", () => {
  it("retains explicit damage presence through module aggregation", () => {
    if (!lua) return;
    const compiled = compileScriptWorkspace(ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 0)));
    expect(compiled.isOk()).toBe(true);
    if (compiled.isErr()) return;
    const bundle = compiled.value.compiledFiles["Data/Scripts/dist/main.lua"]?.content;
    const dispatch = bundle?.match(/function entry\.onWeaponHit\(ctx\)[\s\S]*?\nend/)?.[0];
    expect(dispatch).toBeDefined();
    if (!dispatch) return;
    const source = `
local modules = {}
local entry = {}
local function __modulesForHook() return modules end
${dispatch}
local ctx = {damage = 5}
for _, module in ipairs({{}, {onWeaponHit=function() end}, {onWeaponHit=function() return {} end}}) do
  modules = {module}
  assert(entry.onWeaponHit(ctx).damage == nil, 'absence became an explicit override')
end
modules = {{onWeaponHit=function(context) return {damage=context.damage} end}}
assert(entry.onWeaponHit(ctx).damage == 5, 'same-value override lost its presence')
modules = {{onWeaponHit=function() return {damage=0} end}, {onWeaponHit=function() return {} end}}
assert(entry.onWeaponHit(ctx).damage == 0, 'zero override was replaced by a default')
modules = {{onWeaponHit=function() return {handled=true} end}, {onWeaponHit=function() return {damage=7} end}}
local handled = entry.onWeaponHit(ctx)
assert(handled.handled and handled.damage == nil, 'unreached hook changed handled damage')
`;
    const directory = Result.fromThrowable(() => mkdtempSync(join(tmpdir(), "pangea-weapon-dispatch-")), String)();
    expect(directory.isOk()).toBe(true);
    if (directory.isErr()) return;
    const file = join(directory.value, "verify.lua");
    const written = Result.fromThrowable(() => writeFileSync(file, source), String)();
    const executed = written.andThen(() => Result.fromThrowable(() => execFileSync(lua, [file], { encoding: "utf8" }), String)());
    Result.fromThrowable(() => rmSync(directory.value, { recursive: true, force: true }), String)();
    expect(executed.isOk() ? executed.value : executed.error).toBe("");
  });
});
