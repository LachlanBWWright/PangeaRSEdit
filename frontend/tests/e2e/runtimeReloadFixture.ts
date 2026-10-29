import { expect, type Page } from "@playwright/test";
import { routeRuntimeCallbacks } from "./runtimeScriptLifecycle";

export interface ReloadTarget {
  name: string;
  path: string;
  query: string;
  level: number;
  asset: string;
  manualStart?: boolean;
}

export const reloadTargets: readonly ReloadTarget[] = [
  { name: "Otto Matic", path: "ottomatic/OttoMatic.html", query: "level=0", level: 0, asset: "games/ottomatic/models/global.bg3d" },
  { name: "Bugdom", path: "bugdom/game.html", query: "level=0&embed=1", level: 0, asset: "games/bugdom1/models/Global_Models1.3dmf" },
  { name: "Bugdom 2", path: "bugdom2/Bugdom2.html", query: "level=2", level: 2, asset: "games/bugdom2/skeletons/Mouse.bg3d", manualStart: true },
  { name: "Billy Frontier", path: "billyfrontier/billyfrontier.html", query: "level=0", level: 0, asset: "games/billyfrontier/skeletons/Billy.bg3d" },
  { name: "Cro-Mag Rally", path: "cromagrally/CroMagRally.html", query: "track=3&car=1", level: 2, asset: "games/cromagrally/skeletons/GragStanding.bg3d" },
  { name: "Mighty Mike", path: "mightymike/index.html", query: "level=1:0&deferStart=1", level: 3, asset: "data/mightymike/shapes/main.shapes", manualStart: true },
  { name: "Nanosaur", path: "nanosaur/index.html", query: "level=0&extreme=0", level: 0, asset: "games/nanosaur1/models/Global_Models.3dmf" },
  { name: "Nanosaur 2", path: "nanosaur2/Nanosaur2.html", query: "level=0&deferStart=1", level: 0, asset: "games/nanosaur2/models/global.bg3d", manualStart: true },
];

export function reloadProbeScript(generation: number): string {
  return routeRuntimeCallbacks(`local pangea = require("pangea")
local entry = {}
local generation = ${generation}
local frame = 0
local root, child, marker
local spawningChild = false
local timerTicks, taskTicks, ownerEvents = 0, 0, 0
local deaths, respawns, completions = 0, 0, 0
function entry.onObjectFrame(ctx)
  if ctx.objectType ~= "reload-probe" or ctx.event ~= "spawn" or spawningChild then return end
  spawningChild = true
  child = assert(pangea.spawn.scripted("reload-probe", ctx.position), "child spawn failed")
  pangea.time.every(0.01, function() timerTicks = timerTicks + 1 end)
  pangea.task.start(function()
    while true do
      taskTicks = taskTicks + 1
      pangea.task.wait(0.01)
    end
  end)
  pangea.events.on("reload-owner-probe", function() ownerEvents = ownerEvents + 1 end)
end
function entry.onFrame(ctx)
  local player = pangea.player.get(0)
  if not player then return end
  frame = frame + 1
  pangea.events.emit("reload-owner-probe", {})
  if frame == 1 then
    root = assert(pangea.spawn.scripted("reload-probe", player.position), "root spawn failed")
    assert(child and pangea.object.exists(child), "owned child missing")
  end
  if frame == 60 then
    assert(timerTicks > 0 and taskTicks > 1 and ownerEvents > 0, "owner work never executed")
    assert(pangea.object.delete(root), "owner delete failed")
  end
  if frame == 65 then
    assert(not pangea.object.exists(root), "deleted root remained live")
    assert(not pangea.object.exists(child), "owned child survived root deletion")
    local ticks = timerTicks
    marker = assert(pangea.spawn.scripted("reload-probe", player.position), "marker spawn failed")
    local state = pangea.object.state(marker)
    state.generation = generation
    state.ownerCleaned = true
    state.timerTicksAtCleanup = ticks
    state.taskTicksAtCleanup = taskTicks
    state.eventsAtCleanup = ownerEvents
  end
  if marker then
    local state = pangea.object.state(marker)
    assert(timerTicks == state.timerTicksAtCleanup, "owner timer survived deletion")
    assert(taskTicks == state.taskTicksAtCleanup, "owner task survived deletion")
    assert(ownerEvents == state.eventsAtCleanup, "owner subscription survived deletion")
    state.frames = frame
    state.deaths = deaths
    state.respawns = respawns
    state.completions = completions
    state.level = ctx.levelNum
  end
end
function entry.onDeath(ctx) deaths = deaths + 1 end
function entry.onPlayerRespawn(ctx) respawns = respawns + 1 end
function entry.onLevelComplete(ctx) completions = completions + 1 end
return entry
`);
}

export async function launchReloadTarget(page: Page, target: ReloadTarget) {
  await page.goto(`generated/pangea-ports/wasm/${target.path}?${target.query}`);
  await page.waitForFunction(() => window.Module?.calledRun === true && window.Module.FS?.writeFile !== undefined,
    null, { timeout: 60_000 });
  const written = await page.evaluate(async ({ asset, level }) => {
    const runtime = window.Module;
    if (!runtime?.FS?.writeFile) return false;
    for (const directory of ["/Data/Scripts", "/Data/Scripts/dist", "/Data/Scripts/config", "/Data/Scripts/assets", "/Data/Scripts/assets/models"]) {
      if (!runtime.FS.analyzePath?.(directory).exists) runtime.FS.mkdir?.(directory);
    }
    const response = await fetch(`/PangeaRSEdit/${asset}`);
    if (!response.ok) return false;
    const modelPath = `Data/Scripts/assets/models/reload.${asset.split(".").at(-1)}`;
    runtime.FS.writeFile(modelPath, new Uint8Array(await response.arrayBuffer()));
    runtime.FS.writeFile("Data/Scripts/dist/main.lua", new TextEncoder().encode("return {}"));
    runtime.FS.writeFile("Data/Scripts/config/reload.json", new TextEncoder().encode(JSON.stringify({
      version: 1,
      levels: { [level]: { script: "Data/Scripts/dist/main.lua", customObjects: [{
        id: "reload-probe", visual: { kind: "customDisplayGroup", modelPath, modelObject: 0 },
      }] } },
    })));
    return true;
  }, { asset: target.asset, level: target.level });
  expect(written).toBe(true);
  if (target.manualStart) await page.locator("#play-btn").click();
  await page.waitForFunction(() => window.Module?.ccall?.("PangeaScript_GetStatusEnabled", "boolean", [], []) === true,
    null, { timeout: 45_000 });
  const activated = await page.evaluate((level) => {
    const call = window.Module?.ccall;
    if (!call) return null;
    const config = call("PangeaScript_SetConfigPath", "number", ["string"], ["/Data/Scripts/config/reload.json"]);
    const load = call("PangeaScript_LoadLevelConfig", "number", ["number"], [level]);
    const error = call("PangeaScript_GetStatusLastError", "string", [], []);
    const startup = call("PangeaScript_SetStartupScript", "number", ["string"], ["Data/Scripts/dist/main.lua"]);
    return { config, load, startup, error };
  }, target.level);
  expect(activated).toEqual({ config: 0, load: 0, startup: 0, error: "" });
  expect(await replaceRuntimeSource(page, reloadProbeScript(1))).toBe(0);
}

export async function replaceRuntimeSource(page: Page, source: string, level?: number) {
  return page.evaluate(({ text, configLevel }) => {
    const runtime = window.Module;
    if (!runtime?.FS?.writeFile || !runtime.ccall) return null;
    runtime.FS.writeFile("Data/Scripts/dist/main.lua", new TextEncoder().encode(text));
    return configLevel === undefined
      ? runtime.ccall("PangeaScript_Reload", "number", [], [])
      : runtime.ccall("PangeaScript_LoadLevelConfig", "number", ["number"], [configLevel]);
  }, { text: source, configLevel: level });
}

export async function rejectMalformedConfig(page: Page, level: number) {
  return page.evaluate((configLevel) => {
    const runtime = window.Module;
    if (!runtime?.FS?.writeFile || !runtime.FS.readFile || !runtime.ccall) return null;
    const path = "Data/Scripts/config/reload.json";
    const original = runtime.FS.readFile(path);
    runtime.FS.writeFile(path, new TextEncoder().encode('{"version":1,"levels":'));
    const status = runtime.ccall("PangeaScript_LoadLevelConfig", "number", ["number"], [configLevel]);
    runtime.FS.writeFile(path, original);
    return status;
  }, level);
}
