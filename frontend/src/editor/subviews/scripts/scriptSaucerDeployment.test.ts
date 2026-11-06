// @vitest-environment node
import { execFileSync } from "node:child_process";
import { Result } from "neverthrow";
import { expect, it } from "vitest";
import deployment from "./scriptSaucerDeployment.lua?raw";
import arrival from "./scriptActorArrival.lua?raw";
import landing from "./scriptLandingSearch.lua?raw";

const lua = process.env.PANGEA_LUA_EXECUTABLE;

it.skipIf(!lua)("bounds deployments, hands off actors, replenishes losses and clears owned resources on unload", () => {
  if (!lua) return;
  const program = `
local p = {object={},spawn={},player={},world={},resources={}}
local objects, aliens = {}, {}
local function spawn(position)
  local handle={id=#objects+1,generation=1,position=position,state={}}
  objects[#objects+1]=handle; return handle
end
function p.object.exists(h) return not h.deleted end
function p.object.lifeState(h) return h.deleted and 'removed' or 'alive' end
function p.object.capabilities() return {opacity=true} end
function p.object.geometry() return {min={x=-90,y=0,z=-90},max={x=90,y=220,z=90},groundOffset={y=0}} end
function p.object.acquireControl(h) h.token=1; h.controlled=true; return {ok=true,token=1} end
function p.object.hasControl(h,t) return h.token==t end
function p.object.releaseControl(h,t) h.token=nil; h.controlled=false; h.opacity=1; return {ok=true} end
function p.object.position(h) return {x=h.position.x,y=h.position.y,z=h.position.z} end
function p.object.bounds(h) return {min={y=h.position.y}} end
function p.object.setPositionResult(h,v) h.position=v; return {ok=true} end
function p.object.setOpacityResult(h,v) h.opacity=v; return {ok=true} end
function p.object.setScriptControlledResult(h,v) h.controlled=v; return {ok=true} end
function p.object.setAnimationResult() return {ok=true} end
function p.object.moveKinematic(h,d)
  h.position={x=h.position.x+d.x,y=h.position.y+d.y,z=h.position.z+d.z}; return {ok=true}
end
function p.object.deleteResult(h) h.deleted=true; return {ok=true} end
function p.object.state(h) return h.state end
function p.object.findByTag() return {} end
function p.spawn.scripted(id,position) return spawn(position) end
function p.spawn.scriptedResult(id,position) return {ok=true,primary=spawn(position)} end
function p.spawn.nativeResult(id,position)
  local handle=spawn(position); aliens[#aliens+1]=handle; return {ok=true,primary=handle}
end
function p.player.get() return {position={x=0,y=0,z=0}} end
function p.world.sampleTerrain() return {height=0,normal={y=1}} end
function p.world.raycast() return nil,{ok=true} end
function p.world.sweepBox() return nil,{ok=true} end
function p.resources.create()
  local group={objects={}}
  function group:track(h) self.objects[#self.objects+1]=h; return {ok=true} end
  function group:clear() for _,h in ipairs(self.objects) do h.deleted=true end; self.closed=true end
  return group
end
package.preload.pangea=function() return p end
package.preload['helpers.landing-search']=function() ${landing} end
package.preload['helpers.actor-arrival']=function()
  local pangea=p
  ${arrival}
  return arrivals
end
local encounter=(function() ${deployment} end)()
encounter.onLevelStart()
for i=1,1500 do encounter.onFrame({deltaSeconds=0.1}) end
assert(#aliens==3, 'living cap must prevent additional flights')
for _,h in ipairs(aliens) do
  assert(h.opacity==1 and h.controlled==false and h.position.y==0, 'arrival must reach ground and release native AI')
end
aliens[1].deleted=true
for i=1,300 do encounter.onFrame({deltaSeconds=0.1}) end
assert(#aliens==4, 'losses should allow replenishment')
encounter.onLevelUnload()
for _,h in ipairs(objects) do assert(h.deleted, 'unload leaked an owned object') end
`;
  const result = Result.fromThrowable(() => execFileSync(lua, ["-"], { input: program, encoding: "utf8" }), String)();
  expect(result.isErr() ? result.error : result.value).toBe("");
});
