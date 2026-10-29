import { expect, test, type Page } from "@playwright/test";
import { Result } from "neverthrow";
import { z } from "zod";
import { encodeScriptStatePath, scriptInspectorObjectSchema, scriptStatePageSchema, type ScriptStateQuery } from "@pangea/desktop-contracts";
import { launchReloadTarget, reloadTargets, replaceRuntimeSource } from "../runtimeReloadFixture";
import { runtimeHealth, runtimeInspector, runtimeObjectDefinition } from "../scriptRuntimeHealth";

const source = `local p = require("pangea")
local entry = {}
local marker
function entry.onObjectFrame(ctx)
  if ctx.objectType ~= "reload-probe" or ctx.event ~= "spawn" then return end
  for i=1,20 do p.time.after(600,function() end) end
  p.task.start(function() p.task.wait(600) end)
  p.events.on("owned-inspection",function()
    local player=p.player.get(0)
    if player then p.world.sampleTerrain(player.position.x,player.position.z) end
  end)
end
function entry.onFrame(ctx)
  local player=p.player.get(0)
  if not player then return end
  if not marker then
    marker=assert(p.spawn.scripted("reload-probe",player.position))
    local state=p.object.state(marker)
    state.coverage="nested-inspection"
    state.profile={health=7,[2]={name="numeric child"},["a/b\\n\\0"]={name="escaped child"}}
    state.profile.parent=state
    state.self=state
    state.items={}
    for i=1,150 do state.items[i]={index=i} end
    setmetatable(state.profile,{__pairs=function() error("inspector invoked __pairs") end,
      __index=function() error("inspector invoked __index") end,
      __tostring=function() error("inspector invoked __tostring") end})
  end
  local position=p.player.get(0).position
  assert(p.world.sampleTerrain(position.x,position.z))
  p.events.emit("owned-inspection",{})
  p.object.state(marker).frames=ctx.frameNum
end
return entry`;

async function readState(page: Page, query: ScriptStateQuery) {
  const raw = await page.evaluate(({ handle, path, offset }) => window.Module?.ccall?.(
    "PangeaScript_GetObjectStateInspectorJSON", "string", ["number", "number", "string", "number", "number"],
    [handle.id, handle.generation, path, offset, 32]), { ...query, path: encodeScriptStatePath(query.path) });
  const text = z.string().safeParse(raw);
  expect(text.success).toBe(true);
  if (!text.success) return null;
  const json = Result.fromThrowable((): unknown => JSON.parse(text.data), () => "Invalid nested-state JSON")();
  expect(json.isOk()).toBe(true);
  if (json.isErr()) return null;
  const parsed = scriptStatePageSchema.safeParse(json.value);
  expect(parsed.success, JSON.stringify(parsed.error)).toBe(true);
  return parsed.success ? parsed.data : null;
}

test("Native state expansion preserves cycles and typed paths while native calls expose real costs", async ({ page }) => {
  test.setTimeout(180_000);
  const target = reloadTargets.find((candidate) => candidate.name === "Otto Matic");
  expect(target).toBeDefined();
  if (!target) return;
  await launchReloadTarget(page, target);
  expect(await replaceRuntimeSource(page, source)).toBe(0);
  await expect.poll(async () => (await runtimeInspector(page))?.objects
    .find((object) => runtimeObjectDefinition(object) === "reload-probe")?.state.coverage).toBe("nested-inspection");
  const snapshot = await runtimeInspector(page);
  const marker = snapshot?.objects.find((object) => object.state.coverage === "nested-inspection");
  expect(marker).toBeDefined();
  if (!marker) return;
  const handle = { id: marker.id, generation: marker.generation };
  const rawObject = await page.evaluate(({ id, generation }) => window.Module?.ccall?.(
    "PangeaScript_GetObjectInspectorJSON", "string", ["number", "number"], [id, generation]), handle);
  const objectText = z.string().safeParse(rawObject);
  expect(objectText.success).toBe(true);
  if (!objectText.success) return;
  const objectJSON = Result.fromThrowable((): unknown => JSON.parse(objectText.data), () => "Invalid object resource JSON")();
  expect(objectJSON.isOk()).toBe(true);
  if (objectJSON.isErr()) return;
  const objectPage = z.object({ objects: z.array(scriptInspectorObjectSchema), error: z.string().nullable() }).safeParse(objectJSON.value);
  expect(objectPage.success).toBe(true);
  if (!objectPage.success) return;
  const resources = objectPage.data.objects[0]?.resources;
  expect(resources?.timers.total).toBe(20);
  expect(resources?.timers.entries).toHaveLength(20);
  expect(resources?.timers.truncated).toBe(false);
  expect(resources?.tasks.entries).toContainEqual(expect.objectContaining({ status: "sleeping" }));
  expect(resources?.subscriptions.entries).toContainEqual(expect.objectContaining({ event: "owned-inspection", once: false }));
  const root = await readState(page, { handle, path: [], offset: 0 });
  expect(root?.error).toBeNull();
  expect(root?.entries.find((entry) => entry.key === "self")).toMatchObject({ type: "table", cycle: true, expandable: false });
  const profile = await readState(page, { handle, path: ["profile"], offset: 0 });
  expect(profile?.entries.find((entry) => entry.key === "health")).toMatchObject({ type: "number", value: "7" });
  expect(profile?.entries.find((entry) => entry.key === "parent")).toMatchObject({ cycle: true, expandable: false });
  for (const key of [2, "a/b\n\0"]) {
    expect((await readState(page, { handle, path: ["profile", key], offset: 0 }))?.entries)
      .toContainEqual(expect.objectContaining({ key: "name", type: "string" }));
  }
  const indices: number[] = [];
  let offset: number | null = 0;
  for (let request = 0; offset !== null && request < 10; request++) {
    const result = await readState(page, { handle, path: ["items"], offset });
    expect(result?.total).toBe(150);
    if (!result) return;
    indices.push(...result.entries.flatMap((entry) => entry.key === null || entry.type !== "table" ? [] : [Number(entry.key)]));
    expect(result.nextOffset === null || result.nextOffset > offset).toBe(true);
    offset = result.nextOffset;
  }
  expect(offset).toBeNull();
  expect(indices.sort((a, b) => a - b)).toEqual(Array.from({ length: 150 }, (_, index) => index + 1));
  await expect.poll(async () => (await runtimeInspector(page))?.nativeCosts?.current.calls).toBeGreaterThan(0);
  await expect.poll(async () => (await runtimeInspector(page))?.nativeCosts?.previous.calls).toBeGreaterThan(0);
  const costs = (await runtimeInspector(page))?.nativeCosts;
  expect(costs?.current.milliseconds).toBeGreaterThanOrEqual(0);
  expect(costs?.previous.calls).toBeGreaterThan(0);
  await expect.poll(async () => (await runtimeInspector(page))?.nativeCosts?.window?.frames,
    { timeout: 30_000 }).toBeGreaterThanOrEqual(10);
  const costWindow = (await runtimeInspector(page))?.nativeCosts?.window;
  expect(costWindow?.history.length).toBeGreaterThanOrEqual(10);
  expect(costWindow?.entries.some((entry) => entry.object?.id === handle.id && entry.object.generation === handle.generation && entry.calls > 0)).toBe(true);
  const before = Number(marker.state.frames);
  await expect.poll(async () => Number((await runtimeInspector(page))?.objects
    .find((object) => object.id === handle.id && object.generation === handle.generation)?.state.frames),
  { timeout: 30_000 }).toBeGreaterThan(before + 30);
  expect((await readState(page, { handle, path: ["profile", "missing"], offset: 0 }))?.error).toBeTruthy();
  expect(await runtimeHealth(page)).toMatchObject({ enabled: true, scriptsDisabled: false, errorCount: 0, budgetExceeded: 0 });
  expect(await replaceRuntimeSource(page, "return {}")).toBe(0);
  expect((await readState(page, { handle, path: [], offset: 0 }))?.error).toBeTruthy();
});
