import { expect, test } from "@playwright/test";
import { launchReloadTarget, reloadTargets, replaceRuntimeSource } from "../runtimeReloadFixture";
import { routeRuntimeCallbacks } from "../runtimeScriptLifecycle";
import { runtimeHealth, runtimeInspector } from "../scriptRuntimeHealth";

for (const name of ["Cro-Mag Rally", "Nanosaur 2"]) {
  test(`${name}: native projectiles filter hits and apply scripted enemy damage`, async ({ page }) => {
    test.setTimeout(180_000);
    const target = reloadTargets.find((entry) => entry.name === name);
    expect(target).toBeDefined();
    if (!target) return;
    await launchReloadTarget(page, target);
    const configured = await page.evaluate(({ level, asset, name }) => {
      const runtime = window.Module;
      if (!runtime?.FS?.writeFile || !runtime.ccall) return null;
      runtime.FS.writeFile("Data/Scripts/config/reload.json", new TextEncoder().encode(JSON.stringify({ version: 1,
        levels: { [level]: { script: "Data/Scripts/dist/main.lua", customObjects: [{ id: "reload-probe",
          visual: { kind: "customDisplayGroup", modelPath: `Data/Scripts/assets/models/reload.${asset.split(".").at(-1)}`, modelObject: name === "Nanosaur 2" ? 30 : 0 },
          collision: { preset: "enemy", bounds: { width: 800, height: 800, depth: 800 } },
        }] } },
      })));
      return runtime.ccall("PangeaScript_LoadLevelConfig", "number", ["number"], [level]);
    }, target);
    expect(configured).toBe(0);
    const source = routeRuntimeCallbacks(`local p=require('pangea')
local entry={}
local target,group,nextShot,hits,applied,settledAt=nil,nil,0,0,0,nil
local weapon=${name === "Cro-Mag Rally" ? 5 : 0}
function entry.onFrame(ctx)
  local player=p.player.get(0)
  if not player or player.dead then return end
  local state=p.level.state()
  if not target then
    local point={x=player.position.x+1200,y=player.position.y+600,z=player.position.z}
    target=assert(p.spawn.scriptedResult('reload-probe',point,{placement='world'}).primary)
    assert(p.object.setHealthResult(target,3).ok)
    group=assert(p.resources.create({scope='level'}))
    assert(group:track(target).ok)
    assert(group:watch(target,{onDeath=function(_,notice)
      assert(notice.reason=='killed')
      state.death=true
    end}).ok)
    state.phase='firing'
  end
  if hits>=4 then
    assert(applied==2 and p.object.lifeState(target)=='dead')
    settledAt=settledAt or p.time.level()+0.5
    state.complete=state.death==true and p.time.level()>=settledAt
    return
  end
  if p.time.level()>=nextShot then
    assert(p.player.setWeaponQuantityResult(0,weapon,10).ok)
    local fired=p.player.fire(0,{weapon=weapon})
    state.fireResult=fired.reason
    nextShot=p.time.level()+${name === "Nanosaur 2" ? 0 : 0.5}
  end
  local projectiles=0
  for _,handle in ipairs(p.object.all()) do
    local kind=p.object.type(handle)
    if kind=='cromag.bottleRocket' or kind=='nanosaur2.projectile' then
      projectiles=projectiles+1
      local projectile=p.object.state(handle)
      if not projectile.aimed then
        local point=p.object.position(target)
        if kind=='nanosaur2.projectile' then
          assert(p.object.setPositionResult(handle,{x=point.x-1000,y=point.y,z=point.z}).ok)
          assert(p.object.setVelocityResult(handle,{x=4000,y=0,z=0}).ok)
        else assert(p.object.setPositionResult(handle,point).ok) end
        projectile.aimed=true
      end
    end
  end
  state.projectiles=projectiles
  state.hits=hits
end
function entry.onWeaponHit(ctx)
  if not target or ctx.target.id~=target.id or ctx.target.generation~=target.generation then return end
  assert(ctx.attackKind=='projectile')
  hits=hits+1
  local state=p.level.state()
  state.hits=hits
  if hits==1 then
    state.filtered=p.object.health(target)==3
    return {applyDamage=false}
  end
  if hits==2 then return {damage=0} end
  if hits==3 then
    assert(p.object.health(target)==3,'zero damage changed health')
    state.zero=true
  end
  return {damage=hits==3 and 0.5 or 10}
end
function entry.onDamageApplied(ctx)
  if not target or ctx.target.id~=target.id then return end
  assert(ctx.attackKind=='projectile' and ctx.playerNum==0,'native damage attribution')
  applied=applied+1
  assert(math.abs(ctx.damage-(applied==1 and 0.5 or 2.5))<0.01)
  p.level.state().applied=applied
end
return entry
`);
    expect(await replaceRuntimeSource(page, source)).toBe(0);
    await expect.poll(async () => (await runtimeInspector(page))?.runtime.levelState,
      { timeout: 45_000 }).toMatchObject({ complete: "true", filtered: "true", zero: "true", applied: "2", hits: "4", death: "true" });
    expect(await runtimeHealth(page)).toMatchObject({ scriptsDisabled: false, errorCount: 0, budgetExceeded: 0 });
  });
}
