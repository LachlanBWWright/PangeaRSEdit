import { expect, test, type Page } from "@playwright/test";
import { Result } from "neverthrow";
import { z } from "zod";
import { scriptInspectorObjectSchema, scriptInspectorPageSchema } from "@pangea/desktop-contracts";
import { launchReloadTarget, reloadTargets, replaceRuntimeSource } from "../runtimeReloadFixture";
import { runtimeHealth } from "../scriptRuntimeHealth";

const objectResponseSchema = z.object({ objects: z.array(scriptInspectorObjectSchema).max(1), error: z.string().nullable() });
const source = `local p = require("pangea")
local entry = {}
local count = 0
function entry.onFrame(ctx)
  local player = p.player.get(0)
  if not player then return end
  for i=count+1,math.min(count+10,150) do
    local handle=assert(p.spawn.scripted("reload-probe",player.position))
    p.object.state(handle).ordinal=i
    count=i
  end
end
return entry`;

function parseResponse(raw: unknown): unknown {
  const text = z.string().safeParse(raw);
  expect(text.success, "Inspector must return JSON text").toBe(true);
  if (!text.success) return null;
  const json = Result.fromThrowable((): unknown => JSON.parse(text.data), () => "Invalid inspector JSON")();
  expect(json.isOk()).toBe(true);
  return json.isOk() ? json.value : null;
}

async function objectPage(page: Page, offset: number, limit: number, scriptedOnly: number) {
  const raw = await page.evaluate(({ offset, limit, scriptedOnly }) => window.Module?.ccall?.(
    "PangeaScript_GetObjectInspectorPageJSON", "string", ["number", "number", "number"], [offset, limit, scriptedOnly]),
  { offset, limit, scriptedOnly });
  const parsed = scriptInspectorPageSchema.safeParse(parseResponse(raw));
  expect(parsed.success, JSON.stringify(parsed.error)).toBe(true);
  return parsed.success ? parsed.data : null;
}

async function inspectObject(page: Page, id: number, generation: number) {
  const raw = await page.evaluate(({ id, generation }) => window.Module?.ccall?.(
    "PangeaScript_GetObjectInspectorJSON", "string", ["number", "number"], [id, generation]), { id, generation });
  const parsed = objectResponseSchema.safeParse(parseResponse(raw));
  expect(parsed.success, JSON.stringify(parsed.error)).toBe(true);
  return parsed.success ? parsed.data : null;
}

async function collectObjects(page: Page, scriptedOnly: number) {
  const objects: z.infer<typeof scriptInspectorObjectSchema>[] = [];
  let offset: number | null = 0;
  let total = 0;
  for (let request = 0; offset !== null && request < 200; request++) {
    const result = await objectPage(page, offset, 17, scriptedOnly);
    expect(result?.error).toBeNull();
    if (!result) return objects;
    expect(result.offset).toBe(offset);
    expect(result.objects.length).toBeGreaterThan(0);
    expect(result.nextOffset === null || result.nextOffset > offset).toBe(true);
    objects.push(...result.objects);
    total = result.total;
    offset = result.nextOffset;
  }
  expect(offset, "Pagination must finish").toBeNull();
  expect(objects).toHaveLength(total);
  expect(new Set(objects.map((object) => `${object.id}:${object.generation}`)).size).toBe(total);
  return objects;
}

test("Inspector pages and exact lookup expose every object beyond 64 and reject stale handles", async ({ page }) => {
  test.setTimeout(180_000);
  const target = reloadTargets.find((candidate) => candidate.name === "Otto Matic");
  expect(target).toBeDefined();
  if (!target) return;
  await launchReloadTarget(page, target);
  expect(await replaceRuntimeSource(page, source)).toBe(0);
  await expect.poll(async () => (await objectPage(page, 0, 17, 1))?.total).toBe(150);
  const scripted = await collectObjects(page, 1);
  expect(scripted).toHaveLength(150);
  expect(scripted.map((object) => Number(object.state.ordinal)).sort((a, b) => a - b))
    .toEqual(Array.from({ length: 150 }, (_, index) => index + 1));
  const native = await objectPage(page, 150, 17, 0);
  expect(native?.total).toBeGreaterThan(150);
  expect(native?.objects.some((object) => (object.definition || object.type) !== "reload-probe")).toBe(true);
  const last = scripted.find((object) => object.state.ordinal === "150");
  expect(last).toBeDefined();
  if (!last) return;
  expect(await inspectObject(page, last.id, last.generation)).toMatchObject({
    error: null, objects: [{ id: last.id, generation: last.generation, state: { ordinal: "150" } }],
  });
  const invalid = await objectPage(page, -1, 17, 0);
  expect(invalid?.objects).toEqual([]);
  expect(invalid?.error).toBeTruthy();
  expect(await replaceRuntimeSource(page, "return {}")).toBe(0);
  await expect.poll(async () => (await objectPage(page, 0, 17, 1))?.total).toBe(0);
  expect((await inspectObject(page, last.id, last.generation))?.objects).toEqual([]);
  expect((await inspectObject(page, last.id, last.generation))?.error).toBeTruthy();
  expect(await runtimeHealth(page)).toMatchObject({ enabled: true, scriptsDisabled: false, errorCount: 0, budgetExceeded: 0 });
});
