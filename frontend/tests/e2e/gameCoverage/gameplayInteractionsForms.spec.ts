import { expect, test } from "@playwright/test";
import { launchReloadTarget, reloadTargets, replaceRuntimeSource } from "../runtimeReloadFixture";
import { runtimeHealth, runtimeInspector } from "../scriptRuntimeHealth";
import { routeRuntimeCallbacks } from "../runtimeScriptLifecycle";

test("Bugdom native form replacements retire old bodies, preserve controller ownership, and recover from rejected transforms", async ({ page }) => {
  test.setTimeout(180_000);
  const target = reloadTargets.find((candidate) => candidate.name === "Bugdom");
  expect(target).toBeDefined();
  if (!target) return;
  await launchReloadTarget(page, target);
  expect(await replaceRuntimeSource(page, routeRuntimeCallbacks(`local p=require("pangea")
local entry={}
local marker, body, oldBody
local frame, transitions, at=0,0,0
function entry.onFrame(ctx)
  frame=frame+1
  if not marker then
    marker=assert(p.spawn.scripted("reload-probe",p.player.get(0).position))
    assert(p.player.setState(0,"ballTime",0).ok)
    local denied=p.player.transform(0,"ball")
    assert(not denied.ok and p.player.get(0).form=="bug","empty ball timer allowed native transformation")
    local invalid=p.player.transform(0,"plane")
    assert(not invalid.ok and p.player.get(0).form=="bug","invalid form mutated native player")
    assert(p.player.setState(0,"ballTime",1).ok)
    local first=p.player.transform(0,"ball")
    assert(first.ok and first.object,"valid transform failed after rejection")
    body=first.object
    assert(p.object.setScriptControlled(body,true),"body controller claim failed")
    transitions=1; at=frame
  end
  if transitions<6 and frame-at>=15 then
    local form=transitions%2==1 and "bug" or "ball"
    assert(p.player.setState(0,"ballTime",1).ok)
    oldBody=body
    local result=p.player.transform(0,form)
    assert(result.ok and result.object,"native transformation rejected")
    body=result.object
    assert(not p.object.exists(oldBody),"replaced native body handle remained live")
    assert(p.object.exists(body) and p.object.scriptControlled(body),"replacement lost controller ownership")
    assert(p.player.get(0).form==form and p.player.relations(0).form==form,"native form snapshots disagree")
    assert(p.player.setVelocity(0,{x=0,y=0,z=0}),"replacement stopped accepting native commands")
    transitions=transitions+1; at=frame
  end
  local state=p.object.state(marker)
  state.coverage="forms"; state.frames=frame; state.transitions=transitions
  state.form=p.player.get(0).form; state.controlled=p.object.scriptControlled(body)
  state.retired=oldBody and not p.object.exists(oldBody) or false
end
return entry
`))).toBe(0);
  const markerState = async () => (await runtimeInspector(page))?.objects.find((object) => object.state.coverage === "forms")?.state;
  await expect.poll(markerState, { timeout: 30_000 }).toMatchObject({ transitions: "6", form: "bug", controlled: "true", retired: "true" });
  const frame = Number((await markerState())?.frames);
  await expect.poll(async () => Number((await markerState())?.frames)).toBeGreaterThan(frame + 60);
  expect(await runtimeHealth(page)).toMatchObject({ enabled: true, scriptsDisabled: false, budgetExceeded: 0 });
});
