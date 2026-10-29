import { expect, test, type Page } from "@playwright/test";
import { launchReloadTarget, reloadTargets } from "../runtimeReloadFixture";
import { runtimeHealth, runtimeInspector, runtimeObjectDefinition } from "../scriptRuntimeHealth";

const source = `local pangea = require("pangea")
local entry = {}
local marker, frames, pickups, resets, respawns = nil, 0, 0, 0, 0
function entry.onPickupCollected(ctx)
  if ctx.pickupId ~= "nanosaur.egg" then return end
  pickups = pickups + 1
  assert(ctx.playerNum == 0 and ctx.amount == 1, "egg context mismatch")
  return {handled=true, consumePickup=pickups > 1}
end
function entry.onPlayerRespawn(ctx)
  assert(ctx.playerNum == 0, "respawn player mismatch")
  respawns = respawns + 1
end
function entry.onObjectFrame(ctx)
  if ctx.objectType ~= "browser-custom-object" then return end
  if ctx.event == "checkpointReset" then
    resets = resets + 1
    if ctx.object.id == marker.id and ctx.object.generation == marker.generation then
      local state = pangea.object.state(marker)
      assert(state.checkpointValue == 17, "checkpoint baseline not restored")
      state.checkpointValue = 99
    end
  end
end
function entry.onFrame(ctx)
  local player = pangea.player.get(0)
  if not player then return end
  frames = frames + 1
  if not marker then
    marker = assert(pangea.spawn.scripted("browser-custom-object", player.position))
    pangea.object.state(marker).checkpointValue = 17
  end
  local state = pangea.object.state(marker)
  state.frames=frames; state.pickups=pickups; state.respawns=respawns; state.resets=resets
  state.eggs=player.eggs[1].recovered; state.required=player.eggs[1].required
  state.lives=player.lives; state.health=player.health; state.dead=player.dead
  state.handle=marker.id; state.generation=marker.generation
end
return entry
`;

async function markerState(page: Page) {
  return (await runtimeInspector(page))?.objects.find((object) => runtimeObjectDefinition(object) === "browser-custom-object")?.state;
}

async function nativeProbe(page: Page, name: string) {
  return page.evaluate((functionName) => window.Module?.ccall?.(functionName, "number", [], []), name);
}

async function installProbe(page: Page) {
  const status = await page.evaluate((script) => {
    const runtime = window.Module;
    if (!runtime?.FS?.writeFile || !runtime.ccall) return null;
    runtime.FS.writeFile("Data/Scripts/dist/main.lua", new TextEncoder().encode(script));
    runtime.FS.writeFile("Data/Scripts/config/reload.json", new TextEncoder().encode(JSON.stringify({
      version: 1, levels: { 0: {
        script: "Data/Scripts/dist/main.lua", customObjects: [{
          id: "browser-custom-object", visual: {
            kind: "customDisplayGroup", modelPath: "Data/Scripts/assets/models/reload.3dmf", modelObject: 0,
          },
        }],
      } },
    })));
    return runtime.ccall("PangeaScript_LoadLevelConfig", "number", ["number"], [0]);
  }, source);
  expect(status).toBe(0);
  await expect.poll(async () => Number((await markerState(page))?.frames)).toBeGreaterThan(5);
}

for (const extreme of [false, true]) {
  test(`Nanosaur ${extreme ? "Extreme" : "standard"}: egg recovery veto and checkpoint restoration follow native progression`, async ({ page }) => {
    test.setTimeout(180_000);
    const target = reloadTargets.find((candidate) => candidate.name === "Nanosaur");
    expect(target).toBeDefined();
    if (!target) return;
    await launchReloadTarget(page, { ...target, query: `level=0&extreme=${extreme ? 1 : 0}` });
    await installProbe(page);
    const initial = await markerState(page);
    expect(initial).toBeDefined();
    const eggs = Number(initial?.eggs);
    const lives = Number(initial?.lives);
    expect(Number(initial?.required)).toBeGreaterThan(0);

    expect(await nativeProbe(page, "NanosaurScript_ProbeEggRecoveryJS")).toBe(0);
    await expect.poll(() => markerState(page)).toMatchObject({ pickups: "1", eggs: String(eggs) });
    expect(await nativeProbe(page, "NanosaurScript_ProbeEggRecoveryJS")).toBeGreaterThan(0);
    await expect.poll(() => markerState(page)).toMatchObject({ pickups: "2", eggs: String(eggs + 1) });

    for (let reset = 1; reset <= 2; reset++) {
      expect(await nativeProbe(page, "NanosaurScript_ProbeCheckpointResetJS")).toBe(1);
      await expect.poll(() => markerState(page)).toMatchObject({
        respawns: String(reset), lives: String(lives - reset), health: "1", dead: "false",
        checkpointValue: "99", handle: initial?.handle, generation: initial?.generation,
        eggs: String(eggs + 1),
      });
    }
    const after = await markerState(page);
    expect(Number(after?.resets)).toBeGreaterThanOrEqual(2);
    await expect.poll(async () => Number((await markerState(page))?.frames)).toBeGreaterThan(Number(after?.frames) + 30);
    expect(await runtimeHealth(page)).toMatchObject({ enabled: true, scriptsDisabled: false, errorCount: 0, budgetExceeded: 0, lastError: "" });
  });
}
