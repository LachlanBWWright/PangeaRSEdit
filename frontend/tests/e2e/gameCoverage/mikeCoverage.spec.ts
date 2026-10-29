import { expect, test, type Page } from "@playwright/test";
import { launchReloadTarget, reloadTargets, replaceRuntimeSource } from "../runtimeReloadFixture";
import { routeRuntimeCallbacks } from "../runtimeScriptLifecycle";
import { runtimeHealth, runtimeInspector } from "../scriptRuntimeHealth";

const target = reloadTargets.find((candidate) => candidate.name === "Mighty Mike");

async function markerState(page: Page) {
  return (await runtimeInspector(page))?.objects.find((object) => object.state.coverage === "mike")?.state;
}

async function launchProbe(page: Page, source: string) {
  expect(target).toBeDefined();
  if (!target) return;
  await launchReloadTarget(page, target);
  expect(await replaceRuntimeSource(page, routeRuntimeCallbacks(source))).toBe(0);
}

test("Mighty Mike native damage consumes a life and respawns with matching Lua callbacks", async ({ page }) => {
  test.setTimeout(180_000);
  await launchProbe(page, deathSource);
  await expect.poll(() => markerState(page)).toMatchObject({ ready: "true", lives: "4", health: "0" });
  for (const attempt of [1, 2]) {
    expect(await page.evaluate(() => window.Module?.ccall?.("MikeScript_ProbePlayerDamageJS", "number", [], []))).toBe(-1);
    await expect.poll(() => markerState(page), { timeout: 45_000 }).toMatchObject({
      deaths: "1", respawns: "1", damageApplied: "1",
      lives: String(4 - attempt), dead: "false", health: "1",
    });
    if (attempt === 1) {
      expect(await replaceRuntimeSource(page, routeRuntimeCallbacks(armSecondDeathSource))).toBe(0);
      await expect.poll(() => markerState(page)).toMatchObject({ ready: "true", lives: "3", health: "0" });
    }
  }
  expect(await runtimeHealth(page)).toMatchObject({ scriptsDisabled: false, budgetExceeded: 0, lastError: "" });
});

test("Mighty Mike rejects unavailable forms and invalid Shapes sequences then executes valid animation", async ({ page }) => {
  test.setTimeout(180_000);
  await launchProbe(page, animationSource);
  await expect.poll(() => markerState(page)).toMatchObject({
    complete: "true", frogRejected: "true", shipRejected: "true", form: "mike",
    animationRejected: "true", animationPreserved: "true", animation: "0", speed: "2",
  });
  expect((await runtimeInspector(page))?.callbackFailures).toBe(0);
  expect(await runtimeHealth(page)).toMatchObject({ scriptsDisabled: false, budgetExceeded: 0 });
});

const deathSource = `local pangea = require("pangea")
local entry = {}
local marker
local deaths, respawns, damageApplied = 0, 0, 0
function entry.onDeath(ctx)
  assert(ctx.playerNum==0 and pangea.player.get(0).dead, "death callback preceded native death")
  assert(damageApplied==1 and respawns==0, "death callback order mismatch")
  deaths=deaths+1
end
function entry.onPlayerRespawn(ctx)
  local player=pangea.player.get(0)
  assert(ctx.playerNum==0 and not player.dead and player.health==1, "respawn preceded native restoration")
  assert(deaths==1 and player.lives==3, "respawn callback order or lives mismatch")
  respawns=respawns+1
end
function entry.onDamageApplied(ctx)
  assert(ctx.playerNum==0 and ctx.damage==1, "damage callback context mismatch")
  assert(deaths==0 and respawns==0, "damage callback order mismatch")
  damageApplied=damageApplied+1
end
function entry.onFrame(ctx)
  local player=pangea.player.get(0)
  if not player then return end
  if not marker then
    marker=assert(pangea.spawn.scripted("reload-probe", player.position))
    assert(pangea.player.setLives(0,4))
    assert(pangea.player.setHealth(0,0))
    player=pangea.player.get(0)
  end
  local state=pangea.object.state(marker)
  state.coverage="mike"; state.ready=true
  state.deaths=deaths; state.respawns=respawns; state.damageApplied=damageApplied
  state.lives=player.lives; state.health=player.health; state.dead=player.dead
end
return entry
`;

const armSecondDeathSource = deathSource
  .replace("setLives(0,4)", "setLives(0,3)")
  .replace("player.lives==3", "player.lives==2");

const animationSource = `local pangea = require("pangea")
local entry = {}
local marker, frames
function entry.onFrame(ctx)
  local player=pangea.player.get(0)
  if not player then return end
  if not marker then
    marker=assert(pangea.spawn.scripted("reload-probe", player.position))
    local state=pangea.object.state(marker)
    state.coverage="mike"
    local frog=pangea.player.transform(0,"frog")
    local ship=pangea.player.transform(0,"ship")
    state.frogRejected=not frog.ok and frog.reason=="incompatible-item"
    state.shipRejected=not ship.ok and ship.reason=="incompatible-item"
    state.form=pangea.player.relations(0).form
    local previous=pangea.object.animation(marker)
    local invalid=pangea.object.setAnimationResult(marker,65535,1)
    state.animationRejected=not invalid.ok
    state.animationPreserved=pangea.object.animation(marker)==previous
    assert(pangea.object.setAnimation(marker,0,2),"valid Shapes sequence rejected")
    frames=0
  end
  frames=frames+1
  local state=pangea.object.state(marker)
  state.animation=pangea.object.animation(marker)
  state.speed=pangea.object.animationSpeed(marker)
  state.complete=frames>=60
end
return entry
`;
