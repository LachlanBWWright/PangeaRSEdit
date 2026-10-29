import { expect, test, type Page } from "@playwright/test";
import { launchReloadTarget, reloadTargets, replaceRuntimeSource } from "../runtimeReloadFixture";
import { expectNoLuaFailures, runtimeHealth, runtimeInspector } from "../scriptRuntimeHealth";
import { routeRuntimeCallbacks } from "../runtimeScriptLifecycle";

async function launchBilly(page: Page, level: number, source: string) {
  const target = reloadTargets.find((candidate) => candidate.name === "Billy Frontier");
  expect(target).toBeDefined();
  if (!target) return;
  await launchReloadTarget(page, { ...target, level, query: `level=${level}` });
  expect(await replaceRuntimeSource(page, routeRuntimeCallbacks(`${source}\n`))).toBe(0);
  await expect.poll(async () => (await runtimeInspector(page))?.objects.some((object) => object.state.coverage === "billy"))
    .toBe(true);
}

async function markerState(page: Page) {
  return (await runtimeInspector(page))?.objects.find((object) => object.state.coverage === "billy")?.state;
}

const completionScript = `local pangea = require("pangea")
local entry = {}
local marker
function entry.onFrame(ctx)
  local player = pangea.player.get(0)
  if not player then return end
  if not marker then
    marker = assert(pangea.spawn.scripted("reload-probe", player.position))
    pangea.object.state(marker).coverage = "billy"
  end
end
function entry.onLevelComplete(ctx)
  assert(ctx.levelNum == 0 and ctx.mode == "duel", "wrong completed area")
  assert(pangea.player.getState(0, "area.completed") == true, "completion flag missing")
  pangea.log.info("billy coverage native complete")
end
function entry.onLevelUnload(ctx)
  assert(ctx.levelNum == 0, "wrong unloaded area")
  pangea.log.info("billy coverage native unload")
end
function entry.onObjectFrame(ctx)
  if marker and ctx.object.id == marker.id and ctx.event == "destroy" then
    pangea.log.info("billy coverage scene object destroyed")
  end
end
return entry`;

const deathScript = `local pangea = require("pangea")
local entry = {}
local marker
local deaths = 0
function entry.onDeath(ctx)
  assert(ctx.playerNum == 0 and ctx.levelNum == 3, "wrong native death context")
  assert(pangea.player.get(0).health == 0, "native death did not clear health")
  deaths = deaths + 1
  pangea.log.info("billy coverage native death")
end
function entry.onFrame(ctx)
  local player = pangea.player.get(0)
  if not player then return end
  if not marker then
    marker = assert(pangea.spawn.scripted("reload-probe", player.position))
    pangea.object.state(marker).coverage = "billy"
  end
  local state = pangea.object.state(marker)
  state.deaths = deaths
  if deaths == 1 and not state.respawned then
    assert(pangea.player.getState(0, "player.dead") == true, "native dead state missing")
    local result = pangea.player.respawn(0)
    assert(result.ok, result.message)
    assert(pangea.player.getState(0, "player.dead") == false, "respawn did not clear native death")
    assert(pangea.player.get(0).health == 1, "respawn did not restore health")
    state.respawned = true
    state.respawnFrame = ctx.frameNum
  end
  if state.respawned then
    assert(pangea.player.getState(0, "player.dead") == false, "player died again after respawn")
    assert(pangea.player.get(0).health > 0, "respawned player lost all health")
    state.framesAfterRespawn = ctx.frameNum - state.respawnFrame
  end
end
return entry`;

test("Billy duel native completion dispatches area completion, unload and object destruction", async ({ page }) => {
  const messages: string[] = [];
  page.on("console", (message) => messages.push(message.text()));
  await launchBilly(page, 0, completionScript);
  expect(await page.evaluate(() => window.Module?.ccall?.("BillyScript_ProbeAreaCompletionJS", "number", [], []))).toBe(1);
  await expect.poll(() => messages.join("\n")).toContain("billy coverage native complete");
  await expect.poll(() => messages.join("\n")).toContain("billy coverage native unload");
  await expect.poll(() => messages.join("\n")).toContain("billy coverage scene object destroyed");
  expect(messages.filter((message) => message.includes("billy coverage native complete"))).toHaveLength(1);
  expect(messages.filter((message) => message.includes("billy coverage native unload"))).toHaveLength(1);
  expect(messages.filter((message) => message.includes("billy coverage scene object destroyed"))).toHaveLength(1);
  expect(messages.findIndex((message) => message.includes("billy coverage native complete")))
    .toBeLessThan(messages.findIndex((message) => message.includes("billy coverage native unload")));
  expect(messages.findIndex((message) => message.includes("billy coverage native unload")))
    .toBeLessThan(messages.findIndex((message) => message.includes("billy coverage scene object destroyed")));
  expectNoLuaFailures(messages);
});

test("Billy stampede native trample death reaches Lua and respawn restores a live player", async ({ page }) => {
  const messages: string[] = [];
  page.on("console", (message) => messages.push(message.text()));
  await launchBilly(page, 3, deathScript);
  expect(await page.evaluate(() => window.Module?.ccall?.("BillyScript_ProbeStampedeDeathJS", "number", [], []))).toBe(1);
  await expect.poll(() => markerState(page)).toMatchObject({ deaths: "1", respawned: "true" });
  await expect.poll(async () => Number((await markerState(page))?.framesAfterRespawn)).toBeGreaterThan(60);
  expect(messages.filter((message) => message.includes("billy coverage native death"))).toHaveLength(1);
  expectNoLuaFailures(messages);
  expect(await runtimeHealth(page)).toMatchObject({ enabled: true, scriptsDisabled: false, errorCount: 0, budgetExceeded: 0, lastError: "" });
});
