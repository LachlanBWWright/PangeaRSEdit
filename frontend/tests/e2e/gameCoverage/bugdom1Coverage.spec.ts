import { expect, test, type Page } from "@playwright/test";
import { Result } from "neverthrow";
import { z } from "zod";
import { launchReloadTarget, reloadTargets, replaceRuntimeSource } from "../runtimeReloadFixture";
import { runtimeHealth, runtimeInspector } from "../scriptRuntimeHealth";
import { routeRuntimeCallbacks } from "../runtimeScriptLifecycle";

const sourceSchema = z.object({
  itemIndex: z.number().int().nonnegative(), nativeType: z.literal(1),
  x: z.number().nonnegative(), z: z.number().nonnegative(),
  width: z.number().positive(), depth: z.number().positive(),
});

async function launch(page: Page) {
  const target = reloadTargets.find((candidate) => candidate.name === "Bugdom");
  expect(target).toBeDefined();
  if (target) await launchReloadTarget(page, target);
}

async function markerState(page: Page) {
  return (await runtimeInspector(page))?.objects.find((object) => object.state.coverage === "bugdom")?.state;
}

test("Bugdom native checkpoint reset restores object state and releases pre-reset owner work", async ({ page }) => {
  test.setTimeout(180_000);
  await launch(page);
  expect(await replaceRuntimeSource(page, routeRuntimeCallbacks(`local p = require("pangea")
local entry = {}
local root, frame, ticks, tasks, events = nil, 0, 0, 0, 0
local deaths, respawns, resets, checkpointValue = 0, 0, 0, 0
function entry.onObjectFrame(ctx)
  if ctx.objectType ~= "reload-probe" then return end
  if ctx.event == "spawn" then
    p.object.state(ctx.object).value = 17
    p.time.every(0.01, function() ticks=ticks+1 end)
    p.task.start(function() while true do tasks=tasks+1; p.task.wait(0.01) end end)
    p.events.on("bugdom-owner", function() events=events+1 end)
  elseif ctx.event == "checkpointReset" then
    resets=resets+1; checkpointValue=p.object.state(ctx.object).value
  end
end
function entry.onDeath(ctx)
  assert(ctx.playerNum == 0 and p.player.get(0).dead, "death callback preceded native death state")
  deaths=deaths+1
end
function entry.onPlayerRespawn(ctx)
  local player=p.player.get(0)
  assert(ctx.playerNum == 0 and not player.dead and player.health == 1, "respawn callback preceded native restoration")
  assert(math.abs(ctx.position.x-p.player.getState(0,"checkpointX"))<0.01, "respawn missed checkpoint x")
  assert(math.abs(ctx.position.z-p.player.getState(0,"checkpointZ"))<0.01, "respawn missed checkpoint z")
  respawns=respawns+1
end
function entry.onFrame(ctx)
  frame=frame+1
  if not root then root=assert(p.spawn.scripted("reload-probe", p.player.get(0).position)) end
  p.events.emit("bugdom-owner", {})
  local state=p.object.state(root)
  if resets == 1 then state.value=99 end
  state.coverage="bugdom"; state.frames=frame; state.ticks=ticks; state.tasks=tasks; state.events=events
  state.deaths=deaths; state.respawns=respawns; state.resets=resets; state.checkpointValue=checkpointValue
  local player=p.player.get(0)
  state.health=player.health; state.dead=player.dead; state.form=player.form
end
return entry
`))).toBe(0);
  await expect.poll(() => markerState(page), { timeout: 30_000 }).toMatchObject({ coverage: "bugdom" });
  await expect.poll(async () => Number((await markerState(page))?.ticks)).toBeGreaterThan(3);
  const original = (await runtimeInspector(page))?.objects.find((object) => object.state.coverage === "bugdom");
  for (const attempt of [1, 2]) {
    expect(await page.evaluate(() => window.Module?.ccall?.("BugdomScript_ProbeDeathAndResetJS", "number", [], []))).toBe(1);
    await expect.poll(() => markerState(page)).toMatchObject({ deaths: String(attempt), respawns: String(attempt), resets: String(attempt), checkpointValue: "17", health: "1", dead: "false" });
  }
  const after = await markerState(page);
  await expect.poll(async () => Number((await markerState(page))?.frames)).toBeGreaterThan(Number(after?.frames) + 60);
  const settled = await markerState(page);
  expect(settled).toMatchObject({ ticks: after?.ticks, tasks: after?.tasks, events: after?.events });
  const inspector = await runtimeInspector(page);
  expect(inspector?.runtime).toMatchObject({ timers: 0, tasks: 0, subscriptions: 0 });
  expect(inspector?.objects.find((object) => object.id === original?.id && object.generation === original.generation)).toBeDefined();
  expect(await runtimeHealth(page)).toMatchObject({ enabled: true, scriptsDisabled: false, budgetExceeded: 0, lastError: "" });
});

test("Bugdom real terrain streaming invalidates owner handles and recreates replacements on re-entry", async ({ page }) => {
  test.setTimeout(180_000);
  await launch(page);
  const text = await page.evaluate(() => window.Module?.ccall?.("BugdomScript_ProbeStreamingSourceJS", "string", [], []));
  const string = z.string().safeParse(text);
  expect(string.success).toBe(true);
  if (!string.success) return;
  const json = Result.fromThrowable((): unknown => JSON.parse(string.data), () => "Invalid source JSON")();
  expect(json.isOk()).toBe(true);
  if (json.isErr()) return;
  const parsed = sourceSchema.safeParse(json.value);
  expect(parsed.success).toBe(true);
  if (!parsed.success) return;
  const source = parsed.data;
  const farX = source.x < source.width / 2 ? source.width - 1600 : 1600;
  const farZ = source.z < source.depth / 2 ? source.depth - 1600 : 1600;
  const script = routeRuntimeCallbacks(`local p=require("pangea")
local entry={}
local marker, first, child, replacement
local ticks, tasks, events, exits, entries, frame, at = 0,0,0,0,0,0,0
local exitTicks, exitTasks, exitEvents = 0,0,0
local stage="initial-out"
local function move(x,z)
  local terrain=assert(p.world.sampleTerrain(x,z))
  assert(p.player.setPosition(0,{x=x,y=terrain.height+300,z=z}))
  assert(p.player.setVelocity(0,{x=0,y=0,z=0}))
end
function entry.onObjectFrame(ctx)
  if ctx.objectType ~= "stream-owner" then return end
  if ctx.event == "spawn" then
    local source=assert(p.object.source(ctx.object))
    assert(source.kind == "terrain" and source.itemIndex == ${source.itemIndex})
    if not first then
      first=ctx.object
      child=assert(p.spawn.scripted("owned-child",ctx.position))
      p.time.every(0.01,function() ticks=ticks+1 end)
      p.task.start(function() while true do tasks=tasks+1; p.task.wait(0.01) end end)
      p.events.on("bugdom-stream",function() events=events+1 end)
    else replacement=ctx.object end
  elseif ctx.event == "streamIn" then entries=entries+1
  elseif ctx.event == "streamOut" then
    exits=exits+1; exitTicks=ticks; exitTasks=tasks; exitEvents=events
  end
end
function entry.onFrame(ctx)
  frame=frame+1; p.events.emit("bugdom-stream",{})
  if not marker then marker=assert(p.spawn.scripted("reload-probe",p.player.get(0).position)) end
  local elapsed=frame-at
  if stage == "initial-out" then
    move(${farX},${farZ})
    if elapsed>150 then stage="first-in"; at=frame end
  elseif stage == "first-in" then
    move(${source.x},${source.z})
    if first and ticks>3 and tasks>3 and events>3 and elapsed>90 then stage="out"; at=frame end
  elseif stage == "out" then
    move(${farX},${farZ})
    if exits>0 and elapsed>120 then
      assert(not p.object.exists(first) and not p.object.exists(child),"stream-out retained owner or child")
      assert(ticks==exitTicks and tasks==exitTasks and events==exitEvents,"stream-out retained owned work")
      stage="second-in"; at=frame
    end
  elseif stage == "second-in" then
    move(${source.x},${source.z})
    if replacement and entries>=2 and elapsed>90 then
      assert(not p.object.exists(first),"stale handle revived")
      assert(first.id~=replacement.id or first.generation~=replacement.generation,"generation reused")
      stage="complete"
    end
  end
  local state=p.object.state(marker)
  state.coverage="bugdom"; state.stage=stage; state.entries=entries; state.exits=exits
  state.oldExists=first and p.object.exists(first) or false
  state.childExists=child and p.object.exists(child) or false
end
return entry
`);
  expect(await page.evaluate(({ source, script }) => {
    const runtime = window.Module;
    if (!runtime?.FS?.writeFile || !runtime.ccall) return null;
    runtime.FS.writeFile("Data/Scripts/dist/main.lua", new TextEncoder().encode(script));
    runtime.FS.writeFile("Data/Scripts/config/reload.json", new TextEncoder().encode(JSON.stringify({ version: 1, levels: { 0: {
      script: "Data/Scripts/dist/main.lua",
      customObjects: ["reload-probe", "stream-owner", "owned-child"].map((id) => ({ id, visual: { kind: "customDisplayGroup", modelPath: "Data/Scripts/assets/models/reload.3dmf", modelObject: 0 } })),
      terrainReplacements: [{ itemIndex: source.itemIndex, nativeType: source.nativeType, x: source.x, z: source.z, customObjectId: "stream-owner", strict: true }],
    } } })));
    return runtime.ccall("PangeaScript_LoadLevelConfig", "number", ["number"], [0]);
  }, { source, script })).toBe(0);
  await expect.poll(() => markerState(page), { timeout: 90_000 }).toMatchObject({ stage: "complete", oldExists: "false", childExists: "false" });
  expect(Number((await markerState(page))?.entries)).toBeGreaterThanOrEqual(2);
  expect(Number((await markerState(page))?.exits)).toBeGreaterThanOrEqual(1);
  expect((await runtimeInspector(page))?.runtime).toMatchObject({ timers: 0, tasks: 0, subscriptions: 0 });
  expect(await runtimeHealth(page)).toMatchObject({ enabled: true, scriptsDisabled: false, budgetExceeded: 0, lastError: "" });
});
