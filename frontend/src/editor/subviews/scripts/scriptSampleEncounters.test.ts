// @vitest-environment node
import { execFileSync } from "node:child_process";
import { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import { GAME_SCRIPTING_SAMPLES } from "./scriptGameSamples";
import common from "./samples/common.lua?raw";
import harness from "../../../../tests/fixtures/sampleEncounterHarness.lua?raw";
import spatial from "@/../../games/pangea-ports/shared/script/pangea_spatial.lua?raw";

const lua = process.env.PANGEA_LUA_EXECUTABLE;
const checks: Readonly<Record<string, string>> = {
  "bugdom-alarm": `
e.step(entry,200)
assert(e.nativeSpawns==3,'living budget must bound reinforcements')
e.killNatives(); e.step(entry,100)
assert(e.nativeSpawns==6,'quota must bound replacements')
e.form, e.touchingAlarm='ball',true
e.step(entry); assert(e.root(id).state.phase=='silenced')
e.step(entry,200); assert(e.nativeSpawns==6)
entry.onPlayerRespawn(); e.rayClear, e.touchingAlarm=false,false; e.step(entry,100)
assert(e.nativeSpawns==6,'fences must prevent alerts')
`,
  "bugdom2-course": `
e.step(entry)
e.players[0].position=e.find('custom.marker')[1].position; e.step(entry)
for index=1,3 do
  local point=e.find('custom.platform')[index].position
  e.players[0].position={x=point.x,y=point.y+100,z=point.z}; e.step(entry)
end
assert(e.root(id).state.phase=='complete' and e.root(id).state.progress==3)
local old=e.find('custom.platform')[1]
entry.onPlayerRespawn(); e.step(entry)
assert(old.deleted and #e.find('custom.platform')==3,'respawn must replace owned course resources')
assert(e.root(id).state.progress==3,'respawn must retain checkpoint progress')
`,
  "nanosaur-nest": `
e.step(entry)
local egg=e.find('nanosaur.egg')[1]
e.carried={id=-1,generation=1}; e.step(entry,20)
assert(e.nativeSpawns==1,'unrelated eggs must not start the encounter')
e.carried=egg.handle; e.step(entry,310)
assert(e.root(id).state.phase=='complete' and e.root(id).state.progress==3)
assert(e.nativeSpawns==4,'survival waves must respect a shared living budget')
assert(not egg.deleted,'sample must preserve native egg recovery')
`,
  "nanosaur2-interception": `
e.step(entry)
local checkpoints=e.find('custom.marker')
e.players[0].position=checkpoints[1].position; e.step(entry)
assert(#e.find('custom.target')==2,'airspace trigger must start interceptors')
local nextPoint=checkpoints[2].position
e.players[0].position={x=nextPoint.x,y=nextPoint.y+2000,z=nextPoint.z}; e.step(entry)
assert(e.root(id).state.progress==0,'flight checkpoints must include altitude')
for index=2,4 do e.players[0].position=checkpoints[index].position; e.step(entry) end
assert(e.root(id).state.phase=='complete' and e.root(id).state.progress==3)
assert(#e.find('custom.target')==0,'completion must stop owned interceptors')
entry.onPlayerRespawn(); e.step(entry)
e.players[0].position=e.find('custom.marker')[1].position; e.step(entry,460)
assert(e.root(id).state.phase=='failed' and #e.find('custom.target')==0)
`,
  "cromag-gates": `
e.players[1]={position={x=50000,y=100,z=50000},rotation={y=0},dead=false}
e.players[2]={position={x=80000,y=100,z=80000},rotation={y=0},dead=false}
e.step(entry)
assert(e.hud[id..':2']==nil,'AI cars must not get local bonus objectives')
local markers=e.find('custom.marker')
e.players[0].position=markers[2].position; e.step(entry)
assert(e.hud[id..':0'].current==1 and e.hud[id..':1'].current==0,'local players need independent progress')
for _=1,2 do
  local available=e.find('custom.marker')
  e.players[0].position=available[#available-1].position; e.step(entry)
end
assert(e.root(id).state.phase=='finished' and e.root(id).state.progress==3)
`,
  "billy-gallery": `
e.step(entry)
local friendly,bonus,normal
for _,target in ipairs(e.find('custom.target')) do
  if target.state.role=='friendly' then friendly=target elseif target.state.role=='bonus' then bonus=target else normal=target end
end
assert(entry.onWeaponHit({target=friendly.handle}).scoreDelta==-100)
assert(entry.onWeaponHit({target=normal.handle}).scoreDelta==100)
assert(entry.onWeaponHit({target=bonus.handle}).scoreDelta==200)
assert(e.root(id).state.progress==2)
assert(entry.onWeaponHit({target={id=-1,generation=1}})==nil,'native targets must retain native damage rules')
e.step(entry,370)
assert(e.root(id).state.phase=='complete' and #e.find('custom.target')==0)
`,
  "mike-lockdown": `
e.step(entry)
for index=1,2 do
  local switch=e.find('custom.marker')[1]
  e.players[0].position=switch.position; e.step(entry)
  assert(e.root(id).state.phase=='defending')
  e.killNatives(); e.step(entry)
end
assert(e.root(id).state.phase=='complete' and #e.find('custom.gate')==0)
assert(e.nativeSpawns==4 and e.opacityCalls==0,'planar sample must avoid unsupported opacity')
`,
};

describe("editable sample encounter behavior", () => {
  for (const sample of GAME_SCRIPTING_SAMPLES) {
    it.skipIf(!lua)(`${sample.id}: objectives, limits and lifecycle cleanup`, () => {
      if (!lua) return;
      const check = checks[sample.id];
      expect(check).toBeDefined();
      const program = `local e=(function() ${harness} end)()\ne.api.spatial=(function() ${spatial} end)()\npackage.preload['helpers.sample']=function() ${common} end\nlocal entry=(function() ${sample.source} end)()\nlocal id=${JSON.stringify(sample.id)}\n${check}\nlocal unload=entry.onLevelUnload or entry.onAreaUnload or entry.onRaceUnload\nunload()\nfor _,object in pairs(e.objects) do assert(object.deleted,'encounter leaked owned object') end\nassert(next(e.hud)==nil,'encounter leaked objectives')\n`;
      const result = Result.fromThrowable(() => execFileSync(lua, ["-"], { input: program, encoding: "utf8" }), String)();
      expect(result.isErr() ? result.error : result.value).toBe("");
    });
  }
});
