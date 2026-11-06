// @vitest-environment node
import { execFileSync } from "node:child_process";
import { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import landing from "./scriptLandingSearch.lua?raw";

const lua = process.env.PANGEA_LUA_EXECUTABLE;

describe("script landing search", () => {
  it.skipIf(!lua)("rejects fences, blocked body routes, water, slopes and failed queries with bounded attempts", () => {
    if (!lua) return;
    const program = `
local mode, rays = 'clear', 0
package.preload.pangea = function() return {world = {
  sampleTerrain = function() return {height=0, normal={y=mode=='slope' and 0.5 or 1}, waterHeight=mode=='water' and 10 or nil} end,
  raycast = function() rays=rays+1; return mode=='fence' and {surface='fence'} or nil, {ok=mode~='failed'} end,
  sweepBox = function() return mode=='blocked' and {surface='fence'} or nil, {ok=mode~='sweep-failed'} end,
}} end
local landing = (function() ${landing} end)()
local target={x=0,y=0,z=0}
assert(landing.find(target,nil,0,12,700,1600,90,220))
for _, value in ipairs({'fence','blocked','water','slope','failed','sweep-failed'}) do
  mode=value; rays=0
  assert(not landing.find(target,nil,0,12,700,1600,90,220), value)
  assert(rays<=12, 'search must remain bounded')
end
`;
    const result = Result.fromThrowable(() => execFileSync(lua, ["-"], { input: program, encoding: "utf8" }), String)();
    expect(result.isErr() ? result.error : result.value).toBe("");
  });
});
