import { expect, test } from "@playwright/test";
import { launchReloadTarget, reloadTargets, replaceRuntimeSource } from "../runtimeReloadFixture";
import { routeRuntimeCallbacks } from "../runtimeScriptLifecycle";
import { runtimeHealth, runtimeInspector, runtimeObjectDefinition } from "../scriptRuntimeHealth";

const recoveryScript = routeRuntimeCallbacks(`local pangea = require("pangea")
local entry = {}
local marker, deaths, respawns, resets = nil, 0, 0, 0
local ticks, tasks, resetTicks, resetTasks = 0, 0, 0, 0
function entry.onDeath(ctx)
  assert(ctx.playerNum == 0, "unexpected death player")
  deaths = deaths + 1
end
function entry.onPlayerRespawn(ctx)
  assert(ctx.playerNum == 0, "unexpected respawn player")
  respawns = respawns + 1
end
function entry.onObjectFrame(ctx)
  if ctx.objectType ~= "reload-probe" then return end
  if ctx.event == "spawn" then
    pangea.time.every(0.01, function() ticks = ticks + 1 end)
    pangea.task.start(function()
      while true do tasks = tasks + 1; pangea.task.wait(0.01) end
    end)
    pangea.events.on("checkpoint-owned-subscription", function() end)
  elseif ctx.event == "checkpointReset" then
    resets = resets + 1; resetTicks = ticks; resetTasks = tasks
  end
end
function entry.onFrame(ctx)
  local player = pangea.player.get(0)
  if not player then return end
  if not marker then marker = assert(pangea.spawn.scripted("reload-probe", player.position)) end
  local state = pangea.object.state(marker)
  state.deaths = deaths; state.respawns = respawns; state.resets = resets
  state.dead = player.dead; state.health = player.health; state.lives = player.lives
  state.level = ctx.levelNum
  state.ticks = ticks; state.tasks = tasks; state.resetTicks = resetTicks; state.resetTasks = resetTasks
end
return entry
`);

for (const mode of [{ name: "terrain", level: 2 }, { name: "tunnel", level: 3 }]) {
  test(`Bugdom 2 ${mode.name} death uses the engine loop to restore the player and dispatch checkpoint lifecycle`, async ({ page }) => {
    test.setTimeout(180_000);
    const target = reloadTargets.find((candidate) => candidate.name === "Bugdom 2");
    expect(target).toBeDefined();
    if (!target) return;
    await launchReloadTarget(page, { ...target, level: mode.level, query: `level=${mode.level}` });
    expect(await replaceRuntimeSource(page, recoveryScript)).toBe(0);
    const state = async () => (await runtimeInspector(page))?.objects.find((object) => runtimeObjectDefinition(object) === "reload-probe")?.state;
    await expect.poll(state).toMatchObject({ deaths: "0", respawns: "0", dead: "false", health: "1", level: String(mode.level) });
    await expect.poll(async () => Number((await state())?.ticks)).toBeGreaterThan(3);
    await expect.poll(async () => Number((await state())?.tasks)).toBeGreaterThan(3);
    const initialLives = Number((await state())?.lives);
    expect(initialLives).toBeGreaterThan(1);
    for (let cycle = 1; cycle <= 2; cycle++) {
      expect(await page.evaluate(() => window.Module?.ccall?.("Bugdom2Script_ProbeDeathJS", "number", [], []))).toBe(1);
      await expect.poll(state, { timeout: 30_000 }).toMatchObject({ deaths: String(cycle), dead: "true", health: "0" });
      await expect.poll(state, { timeout: 60_000 }).toMatchObject({
        deaths: String(cycle), respawns: String(cycle), resets: String(cycle), dead: "false", health: "1", lives: String(initialLives - cycle),
      });
      const recovered = await state();
      expect(recovered?.ticks).toBe(recovered?.resetTicks);
      expect(recovered?.tasks).toBe(recovered?.resetTasks);
    }
    expect((await runtimeInspector(page))?.runtime).toMatchObject({ timers: 0, tasks: 0, subscriptions: 0 });
    expect(await runtimeHealth(page)).toMatchObject({ enabled: true, scriptsDisabled: false, budgetExceeded: 0, errorCount: 0, lastError: "" });
  });
}
