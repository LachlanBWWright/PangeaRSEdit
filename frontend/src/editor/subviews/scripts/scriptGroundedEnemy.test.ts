import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Result } from "neverthrow";
import { expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { compileScriptWorkspace, createScriptWorkspaceContext, loadScriptSample, upsertScriptSourceFile } from "./scriptWorkspaceState";

const luaBinary = process.env["PANGEA_SCRIPT_LUA_BIN"];

it.skipIf(luaBinary === undefined)("exports a grounded enemy with projectiles, armor, and a second life phase", () => {
  if (luaBinary === undefined) return;
  const source = Result.fromThrowable(
    () => readFileSync(join(__dirname, "../../../../../games/pangea-ports/shared/script/examples/grounded-sentinel.lua"), "utf8"),
    () => "Could not read grounded sentinel example",
  )();
  expect(source.isOk()).toBe(true);
  if (source.isErr()) return;
  let workspace = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
  const base = workspace.customObjects[0];
  expect(base).toBeDefined();
  if (!base) return;
  workspace = {
    ...workspace,
    customObjects: [
      { ...base, id: "sentinel", exportName: "groundedSentinel", label: "Sentinel" },
      { ...base, id: "sentinel-shot", exportName: "sentinelShot", label: "Sentinel shot" },
    ],
  };
  workspace = upsertScriptSourceFile(workspace, base.sourceFilePath, source.value);
  const compiled = compileScriptWorkspace(workspace);
  expect(compiled.isOk()).toBe(true);
  if (compiled.isErr()) return;
  const entry = compiled.value.compiledFiles["Data/Scripts/dist/main.lua"];
  expect(entry).toBeDefined();
  if (!entry) return;
  const modules = Object.values(compiled.value.sourceFiles)
    .filter((file) => file.role !== "generated-entry")
    .map((file) => {
      const name = file.path.replace(/^Data\/Scripts\/src\//, "").replace(/\.lua$/, "").replaceAll("/", ".");
      return `package.preload[${JSON.stringify(name)}] = function()\n${file.content}\nend`;
    });
  const harness = [
    "local now=0; local grounded=true; local nextId=1; local timers={}; local entry",
    "local objects={[1]={kind='sentinel', state={}, health=1, position={x=0,y=0,z=0}, velocity={x=0,y=0,z=0}}}",
    "local function object(handle) return objects[handle.id] end",
    "local function copy(v) return {x=v.x,y=v.y,z=v.z} end",
    "pangea={object={},world={},player={},time={},spawn={}}",
    "pangea.object.type=function(h) return object(h).kind end",
    "pangea.object.state=function(h) return object(h).state end",
    "pangea.object.position=function(h) return copy(object(h).position) end",
    "pangea.object.velocity=function(h) return copy(object(h).velocity) end",
    "pangea.object.setPosition=function(h,v) object(h).position=copy(v); return true end",
    "pangea.object.setVelocity=function(h,v) object(h).velocity=copy(v); return true end",
    "pangea.object.setHealth=function(h,v) object(h).health=v; return true end",
    "pangea.object.exists=function(h) return objects[h.id]~=nil end",
    "pangea.object.delete=function(h) objects[h.id]=nil; return true end",
    "pangea.world.groundHeightResult=function(x,z) return {ok=grounded,height=10} end",
    "pangea.player.count=function() return 1 end",
    "pangea.player.get=function(n) return {position={x=600,y=42,z=0}} end",
    "pangea.time.level=function() return now end",
    "pangea.time.after=function(seconds,fn) timers[#timers+1]=fn; return #timers end",
    "pangea.spawn.scripted=function(kind,pos) nextId=nextId+1; local h={id=nextId,generation=1}; objects[h.id]={kind=kind,state={},position=copy(pos),velocity={x=0,y=0,z=0}}; entry.onObjectFrame({object=h,objectType=kind,event='spawn'}); return h end",
    "package.preload['pangea']=function() return pangea end",
    ...modules,
    `entry=(function()\n${entry.content}\nend)()`,
    "local actor={id=1,generation=1}",
    "local function event(name) entry.onObjectFrame({object=actor,objectType='sentinel',event=name,deltaSeconds=0.1}) end",
    "event('spawn'); assert(objects[1].health==4)",
    "event('update'); assert(objects[1].position.y==42 and objects[1].velocity.x==180 and nextId==1)",
    "now=1; event('update'); assert(nextId==2 and objects[2].velocity.x==600 and #timers==1)",
    "local damage=entry.onDamage({target=actor,damage=2}); assert(damage.handled and damage.damage==1)",
    "objects[1].health=0; event('death'); assert(objects[1].health==6 and objects[1].state.phase==2)",
    "damage=entry.onDamage({target=actor,damage=2}); assert(damage.applyDamage==false)",
    "now=2; event('update'); assert(objects[1].velocity.x==300)",
    "objects[1].position.y=100; event('update'); assert(objects[1].velocity.y==-90)",
    "local hit=entry.onTriggerEnter({self={id=2,generation=1},playerNum=0}); assert(hit.damagePlayer==0.25 and hit.deleteSelf and not hit.solid)",
    "local contact=entry.onTriggerEnter({self={id=2,generation=1},playerNum=-1}); assert(contact.damagePlayer==0 and not contact.deleteSelf)",
    "timers[1](); assert(objects[2]==nil)",
    "grounded=false; event('update'); assert(objects[1].velocity.x==0 and objects[1].velocity.y==0)",
    "objects[1].health=0; event('death'); assert(objects[1].health==0)",
    "print('Grounded enemy example passed')",
  ].join("\n");
  const execution = Result.fromThrowable(
    () => execFileSync(luaBinary, ["-"], { input: harness, encoding: "utf8" }),
    () => "Grounded enemy Lua example failed",
  )();
  expect(execution.isOk()).toBe(true);
  if (execution.isOk()) expect(execution.value).toContain("Grounded enemy example passed");
});
