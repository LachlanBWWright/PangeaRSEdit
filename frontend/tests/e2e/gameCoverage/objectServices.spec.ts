import { expect, test } from "@playwright/test";
import { launchReloadTarget, reloadTargets, replaceRuntimeSource } from "../runtimeReloadFixture";
import { routeRuntimeCallbacks } from "../runtimeScriptLifecycle";
import { runtimeHealth, runtimeInspector, runtimeObjects, runtimeObjectDefinition } from "../scriptRuntimeHealth";

const preflightItems: Record<string, readonly string[]> = {
  "Bugdom": ["bugdom.mosquito", "bugdom.spider", "bugdom.larva", "bugdom.flyingBee", "bugdom.pondFish", "bugdom.workerBee", "bugdom.queenBee", "bugdom.roach", "bugdom.skippy", "bugdom.kingAnt"],
  "Bugdom 2": ["bugdom2.chipmunk", "bugdom2.otto", "bugdom2.dragonfly", "bugdom2.moth", "bugdom2.computerBug"],
  "Billy Frontier": ["billy.tremorAlien", "billy.shorty"],
  "Nanosaur 2": ["nanosaur2.egg", "nanosaur2.healthPow", "nanosaur2.fuelPow", "nanosaur2.shieldPow"],
};

for (const target of reloadTargets) {
  test(`${target.name}: object services restore control, manage resources and distinguish death from removal`, async ({ page }) => {
    test.setTimeout(180_000);
    await launchReloadTarget(page, target);
    const configured = await page.evaluate(({ level, asset }) => {
      const runtime = window.Module;
      if (!runtime?.FS?.writeFile || !runtime.ccall) return null;
      runtime.FS.writeFile("Data/Scripts/config/reload.json", new TextEncoder().encode(JSON.stringify({ version: 1,
        levels: { [level]: { script: "Data/Scripts/dist/main.lua", customObjects: [{ id: "reload-probe",
          visual: { kind: "customDisplayGroup", modelPath: `Data/Scripts/assets/models/reload.${asset.split(".").at(-1)}`, modelObject: 0 },
          collision: { preset: "enemy", bounds: { width: 100, height: 100, depth: 100 } },
        }] } },
      })));
      return runtime.ccall("PangeaScript_LoadLevelConfig", "number", ["number"], [level]);
    }, target);
    expect(configured).toBe(0);
    const source = routeRuntimeCallbacks(`local p=require('pangea')
local entry={}
local root,group,watched,animated
function entry.onDamageApplied(ctx)
  if not root or not watched or ctx.target.id~=watched.id then return end
  local state=p.object.state(root)
  state.damageEvents=(state.damageEvents or 0)+1
  if state.damageEvents==1 then
    assert(ctx.source and ctx.source.id==root.id and ctx.playerNum==0 and ctx.attackKind=='melee')
  else
    assert(not ctx.source and ctx.playerNum==-1 and ctx.attackKind=='scripted')
  end
end
function entry.onFrame(ctx)
  local player=p.player.get(0)
  if not player then return end
  if root then return end
  local result=p.spawn.scriptedResult('reload-probe',player.position,{placement='world'})
  assert(result.ok and result.primary,result.message)
  root=result.primary
  local state=p.object.state(root)
  local levelState=p.level.state()
  levelState.phase='checkpoint'
  assert(p.level.captureCheckpoint().ok)
  levelState.phase='changed'
  assert(p.level.restoreCheckpoint() and levelState.phase=='checkpoint')
  assert(#p.player.list({kind='localHuman'})>=1)
  assert(not p.spawn.canSpawn('missing-item').ok)
  assert(#p.spawn.catalog()>0)
  for _,id in ipairs({${(preflightItems[target.name] ?? []).map((id) => JSON.stringify(id)).join(",")}}) do
    local readiness=p.spawn.canSpawn(id)
    assert(readiness.ok and readiness.spawnable~=nil,id..': '..readiness.reason)
    if ${target.name === "Nanosaur 2"} then assert(readiness.spawnable,id..': '..readiness.reason) end
  end
  local crossed=p.spatial.crossing({x=-100,y=0,z=0},{x=100,y=0,z=0},
    {kind='sphere',center={x=0,y=0,z=0},radius=1})
  assert(crossed.ok and crossed.crossed and crossed.fraction<0.5)
  local hudGroup=assert(p.resources.create({scope='level'}))
  local hud=p.ui.objective('ownership-proof',{text='Ownership proof',current=0,total=1})
  assert(hud.ok and hudGroup:hud(hud.handle).ok)
  assert(hudGroup:clear().ok and not p.ui.isActive(hud.handle))
  state.coverage='object-services'
  state.playerActor=player.object~=nil
  if player.object then assert(p.object.exists(player.object)) end
  local capabilities=p.object.capabilities(root)
  assert(capabilities and capabilities.geometry)
  assert(capabilities.opacity==${target.name !== "Mighty Mike"})
  local shape=p.object.geometry(root)
  assert(shape and shape.max.x-shape.min.x==100)
  assert(p.object.setHealthResult(root,1).ok)
  assert(p.object.lifeState(root)=='alive')
  local before=p.object.scriptControlled(root)
  if capabilities.opacity then assert(p.object.setOpacityResult(root,0.4).ok) end
  local lease=p.object.acquireControl(root)
  assert(lease.ok and p.object.hasControl(root,lease.token))
  if capabilities.opacity then assert(p.object.setOpacityResult(root,0.9).ok) end
  assert(p.object.releaseControl(root,lease.token).ok)
  assert(p.object.scriptControlled(root)==before)
  assert(not p.object.hasControl(root,lease.token))
  if capabilities.opacity then assert(math.abs(p.object.opacity(root)-0.4)<0.001) end
  state.restored=true
  group=assert(p.resources.create({owner=root}))
  watched=assert(p.spawn.scriptedResult('reload-probe',player.position,{placement='world'}).primary)
  assert(group:track(watched).ok)
  assert(p.object.setHealthResult(watched,1).ok)
  assert(group:watch(watched,{
    onDeath=function(h,notice) assert(not p.object.exists(h) and notice.reason=='killed'); state.death=true end,
    onRemoved=function(_,notice) assert(state.death and notice.reason=='killed'); state.removed=true end,
  }).ok)
  assert(not p.combat.apply(watched,0.25,{playerNum=99}).ok)
  assert(not p.combat.apply(watched,0.25,{attackKind='invalid'}).ok)
  assert(not p.combat.apply(watched,0.25,{source={id=2147483647,generation=1}}).ok)
  assert(p.object.health(watched)==1 and not state.damageEvents,'invalid attribution mutated combat')
  local hit=p.combat.apply(watched,0.25,{source=root,playerNum=0,attackKind='melee'})
  assert(hit.ok and math.abs(hit.appliedDamage-0.25)<0.01 and not hit.dead)
  hit=p.combat.apply(watched,2)
  assert(hit.ok and math.abs(hit.appliedDamage-0.75)<0.01 and hit.dead)
  assert(state.damageEvents==2,'damage attribution callbacks')
  assert(p.object.exists(watched) and p.object.lifeState(watched)=='dead')
  assert(p.object.deleteResult(watched).ok)
  animated=assert(p.spawn.scriptedResult('reload-probe',player.position,{placement='world'}).primary)
  assert(p.object.setHealthResult(animated,1).ok)
  assert(group:track(animated).ok and group:control(animated).ok)
  group:sequence({function()
    if capabilities.opacity then return p.resources.fade(animated,0.6,0.2) end
    p.task.wait(0.2)
    return {ok=true}
  end},function(outcome) assert(outcome.ok); state.sequence=true end)
  group:every(0.1,function()
    if state.removed and state.sequence then state.complete=true end
  end)
end
return entry
`);
    expect(await replaceRuntimeSource(page, source)).toBe(0);
    await expect.poll(async () => (await runtimeObjects(page)).find((object) => object.state.coverage === "object-services")?.state,
      { timeout: 60_000 }).toMatchObject({ restored: "true", death: "true", removed: "true", sequence: "true", complete: "true" });
    expect(await runtimeHealth(page)).toMatchObject({ scriptsDisabled: false, errorCount: 0, budgetExceeded: 0 });
    expect(await replaceRuntimeSource(page, "return {}\n")).toBe(0);
    await expect.poll(async () => (await runtimeObjects(page)).filter((object) => runtimeObjectDefinition(object) === "reload-probe").length).toBe(0);
    expect((await runtimeInspector(page))?.runtime).toMatchObject({ timers: 0, tasks: 0 });
  });
}
