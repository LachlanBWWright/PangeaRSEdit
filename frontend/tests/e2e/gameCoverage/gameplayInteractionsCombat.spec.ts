import { expect, test, type Page } from "@playwright/test";
import { launchReloadTarget, reloadTargets, replaceRuntimeSource } from "../runtimeReloadFixture";
import { routeRuntimeCallbacks } from "../runtimeScriptLifecycle";
import { runtimeHealth, runtimeInspector } from "../scriptRuntimeHealth";

async function combatState(page: Page) {
  return (await runtimeInspector(page))?.objects.find((object) => object.state.coverage === "native-combat")?.state;
}

async function inflictDamage(page: Page, amount: number) {
  return page.evaluate((damage) => window.Module?.ccall?.(
    "Bugdom2Script_ProbeNativeDamageJS", "number", ["number"], [damage],
  ), amount);
}

test("Bugdom 2 native combat respects veto and damage overrides and recovers from rejected commands", async ({ page }) => {
  test.setTimeout(180_000);
  const target = reloadTargets.find((candidate) => candidate.name === "Bugdom 2");
  expect(target).toBeDefined();
  if (!target) return;
  await launchReloadTarget(page, target);
  expect(await replaceRuntimeSource(page, routeRuntimeCallbacks(combatSource))).toBe(0);
  await expect.poll(() => combatState(page)).toMatchObject({ ready: "true", health: "1" });

  expect(await inflictDamage(page, 0.5)).toBe(1000);
  await expect.poll(() => combatState(page)).toMatchObject({ requests: "1", applied: "0", health: "1" });
  expect(await inflictDamage(page, 0.5)).toBe(875);
  await expect.poll(() => combatState(page)).toMatchObject({ requests: "2", applied: "1", health: "0.875" });
  expect(await inflictDamage(page, -1)).toBe(-1);
  expect(await inflictDamage(page, 0.5)).toBe(750);
  await expect.poll(() => combatState(page)).toMatchObject({
    requests: "3", applied: "2", health: "0.75", invalidRejected: "true", complete: "true",
  });
  expect((await runtimeInspector(page))?.callbackFailures).toBe(0);
  expect(await runtimeHealth(page)).toMatchObject({ scriptsDisabled: false, budgetExceeded: 0 });
});

const combatSource = `local pangea = require("pangea")
local entry = {}
local marker, requests, applied, frames = nil, 0, 0, 0
function entry.onDamage(ctx)
  assert(ctx.playerNum==0 and ctx.damage==0.5, "native damage context mismatch")
  requests=requests+1
  return {handled=true, applyDamage=requests>1, damage=0.125}
end
function entry.onDamageApplied(ctx)
  assert(ctx.playerNum==0 and ctx.damage==0.125, "native damage override not applied")
  applied=applied+1
  local player=pangea.player.get(0)
  assert(player.health==1-applied*0.125, "callback preceded native health mutation")
end
function entry.onFrame(ctx)
  local player=pangea.player.get(0)
  if not player then return end
  if not marker then
    marker=assert(pangea.spawn.scripted("reload-probe",player.position))
    assert(pangea.player.setHealth(0,1))
    local result=pangea.player.transform(99,"frog")
    pangea.object.state(marker).invalidRejected=not result.ok
  end
  if applied==2 then frames=frames+1 end
  local state=pangea.object.state(marker)
  state.coverage="native-combat"; state.ready=true
  state.requests=requests; state.applied=applied
  state.health=pangea.player.get(0).health; state.complete=frames>=60
end
return entry
`;
