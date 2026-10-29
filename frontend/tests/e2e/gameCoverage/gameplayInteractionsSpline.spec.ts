import { expect, test, type Page } from "@playwright/test";
import { launchReloadTarget, replaceRuntimeSource, type ReloadTarget } from "../runtimeReloadFixture";
import { runtimeHealth, runtimeInspector, runtimeObjectDefinition } from "../scriptRuntimeHealth";

const target: ReloadTarget = {
  name: "Nanosaur 2", path: "nanosaur2/Nanosaur2.html", query: "level=0&deferStart=1",
  level: 0, asset: "games/nanosaur2/models/global.bg3d", manualStart: true,
};

const source = `local p = require("pangea")
local entry = {}
local marker, retired = nil, {}
local spawns, destroys, timerTicks, taskTicks, events, frames = 0, 0, 0, 0, 0, 0
function entry.onObjectFrame(ctx)
  if ctx.objectType ~= "spline-coverage" then return end
  if ctx.event == "spawn" then
    local source = assert(p.object.source(ctx.object), "replacement source missing")
    assert(source.kind == "spline" and source.splineNum >= 0 and source.itemIndex >= 0, "replacement source identity lost")
    assert(source.placement >= 0 and source.placement <= 1, "replacement placement invalid")
    spawns = spawns + 1
    local child = assert(p.spawn.scripted("reload-probe", ctx.position), "replacement child missing")
    table.insert(retired, ctx.object)
    table.insert(retired, child)
    p.time.every(0.01, function() timerTicks = timerTicks + 1 end)
    p.task.start(function()
      p.task.wait(0.01)
      taskTicks = taskTicks + 1
    end)
    p.events.on("spline-retired", function() events = events + 1 end)
  elseif ctx.event == "destroy" then
    destroys = destroys + 1
  end
end
function entry.onFrame(ctx)
  local player = p.player.get(0)
  if not player then return end
  frames = frames + 1
  if not marker then marker = assert(p.spawn.scripted("reload-probe", player.position)) end
  p.events.emit("spline-retired", {})
  for _, handle in ipairs(retired) do assert(not p.object.exists(handle), "replacement or child survived native deletion") end
  assert(timerTicks == 0 and taskTicks == 0 and events == 0, "replacement owned work survived native deletion")
  local state = p.object.state(marker)
  state.frames, state.spawns, state.destroys = frames, spawns, destroys
  state.retiredHandles = #retired
end
return entry
`;

async function configureReplacement(page: Page, missingDefinition: boolean) {
  return page.evaluate(({ missing }) => {
    const runtime = window.Module;
    if (!runtime?.ccall || !runtime.FS?.writeFile) return null;
    const call = runtime.ccall;
    const selected = call("Nanosaur2Script_SelectFirstSplineItemForReplacementJS", "number", [], []);
    if (selected !== 1) return { selected, load: null };
    const field = (index: number) => call("Nanosaur2Script_GetSelectedSplineItemFieldJS", "number", ["number"], [index]);
    const placement = call("Nanosaur2Script_GetSelectedSplinePlacementJS", "number", [], []);
    runtime.FS.writeFile("Data/Scripts/config/reload.json", new TextEncoder().encode(JSON.stringify({
      version: 1, levels: { 0: {
        script: "Data/Scripts/dist/main.lua",
        customObjects: ["reload-probe", "spline-coverage"].map((id) => ({
          id, visual: { kind: "customDisplayGroup", modelPath: "Data/Scripts/assets/models/reload.bg3d", modelObject: 0 },
        })),
        splineReplacements: [{ splineNum: field(0), itemIndex: field(1), nativeType: field(2), placement,
          customObjectId: missing ? "missing-definition" : "spline-coverage", strict: false }],
      } },
    })));
    return { selected, load: call("PangeaScript_LoadLevelConfig", "number", ["number"], [0]) };
  }, { missing: missingDefinition });
}

async function probeReplacement(page: Page) {
  return page.evaluate(() => window.Module?.ccall?.("Nanosaur2Script_ProbeFirstSplineReplacementJS", "number", [], []));
}

async function markerState(page: Page) {
  return (await runtimeInspector(page))?.objects.find((object) => runtimeObjectDefinition(object) === "reload-probe")?.state;
}

test("Nanosaur 2 native spline replacements retain source identity and retire children and scheduled work across repeated recreation", async ({ page }) => {
  await launchReloadTarget(page, target);
  expect(await replaceRuntimeSource(page, source)).toBe(0);
  expect(await configureReplacement(page, false)).toEqual({ selected: 1, load: 0 });
  expect(await configureReplacement(page, true)).toEqual({ selected: 1, load: 8 });
  expect(await runtimeHealth(page)).toMatchObject({
    enabled: true, scriptsDisabled: false, errorCount: 1,
    lastError: expect.stringContaining("unknown custom object"),
  });
  for (let cycle = 1; cycle <= 3; cycle++) {
    expect(await probeReplacement(page)).toBe(0);
    await expect.poll(async () => (await markerState(page))?.destroys).toBe(String(cycle));
    expect(await markerState(page)).toMatchObject({ spawns: String(cycle), retiredHandles: String(cycle * 2) });
  }
  const frames = Number((await markerState(page))?.frames);
  await expect.poll(async () => Number((await markerState(page))?.frames)).toBeGreaterThan(frames + 30);
  expect(await runtimeHealth(page)).toMatchObject({ enabled: true, scriptsDisabled: false, errorCount: 1, budgetExceeded: 0 });
});
