import { expect, type Page } from "@playwright/test";
import { z } from "zod";
import { Result } from "neverthrow";
import { scriptInspectorSchema, type ScriptInspectorSnapshot, type ScriptInspectorPage } from "@pangea/desktop-contracts";

export function runtimeObjectDefinition(object: ScriptInspectorSnapshot["objects"][number]): string {
  return object.definition || object.type;
}

const healthSchema = z.object({
  enabled: z.boolean(), bundleLoaded: z.boolean(), scriptsDisabled: z.boolean(),
  errorCount: z.number().int().nonnegative(), budgetExceeded: z.number().int().nonnegative(),
  lastError: z.string(),
  inspectorJSON: z.string(),
});

export function expectNoLuaFailures(messages: readonly string[]) {
  expect(messages.filter((message) => /scripting\s+\w+\s+failed|Disabling scripting host|instruction budget exceeded|Lua runtime could not be created/i.test(message))).toEqual([]);
}

export function expectedNativeRejectionCount(messages: readonly string[]) {
  return messages.filter((message) => message.includes("browser expected native rejection ")).length;
}

export async function runtimeHealth(page: Page) {
  const raw = await page.evaluate(() => {
    const call = window.Module?.ccall;
    if (!call) return null;
    return {
      enabled: call("PangeaScript_GetStatusEnabled", "boolean", [], []),
      bundleLoaded: call("PangeaScript_GetStatusBundleLoaded", "boolean", [], []),
      scriptsDisabled: call("PangeaScript_GetStatusScriptsDisabled", "boolean", [], []),
      errorCount: call("PangeaScript_GetStatusErrorCount", "number", [], []),
      budgetExceeded: call("PangeaScript_GetStatusBudgetExceededCount", "number", [], []),
      lastError: call("PangeaScript_GetStatusLastError", "string", [], []),
      inspectorJSON: call("PangeaScript_GetStatusInspectorJSON", "string", [], []),
    };
  });
  const parsed = healthSchema.safeParse(raw);
  expect(parsed.success, JSON.stringify(raw)).toBe(true);
  return parsed.success ? parsed.data : null;
}

export async function expectRuntimeHealthy(page: Page, messages: readonly string[], expectedErrors: number, requireBundle = true, stage = "runtime health") {
  const observation: { health: z.infer<typeof healthSchema> | null; errors: number } = {
    health: null,
    errors: expectedErrors,
  };
  await expect.poll(async () => {
    observation.health = await runtimeHealth(page);
    observation.errors = Math.max(expectedErrors, expectedNativeRejectionCount(messages));
    return observation.health?.errorCount === observation.errors;
  }, { message: `${stage}: native errors must match completed rejection probes` }).toBe(true);
  const { health, errors } = observation;
  expectNoLuaFailures(messages);
  expect(health, JSON.stringify({ stage, health: health && { ...health, inspectorJSON: undefined } })).toMatchObject({ enabled: true, scriptsDisabled: false, errorCount: errors, budgetExceeded: 0 });
  if (requireBundle) expect(health?.bundleLoaded).toBe(true);
  const inspector = parseInspector(health?.inspectorJSON);
  expect(inspector, stage).toMatchObject({ enabled: true, disabled: false, errors, budgetOverruns: 0 });
}

export async function runtimeInspector(page: Page) {
  const raw = await page.evaluate(() => window.Module?.ccall?.("PangeaScript_GetStatusInspectorJSON", "string", [], []));
  return parseInspector(raw);
}

export async function runtimeObjects(page: Page) {
  const result = await page.evaluate(async () => {
    const modulePath = "/PangeaRSEdit/src/editor/utils/scriptInspector.ts";
    const inspector: typeof import("../../src/editor/utils/scriptInspector") = await import(modulePath);
    const objects: ScriptInspectorPage["objects"] = [];
    let offset: number | null = 0;
    let total = 0;
    for (let request = 0; offset !== null && request < 256; request++) {
      const queried = inspector.queryScriptObjects(window.Module ?? null, { offset, scriptedOnly: false });
      if (queried.isErr()) return { error: queried.error, objects, complete: false, total };
      objects.push(...queried.value.objects);
      total = queried.value.total;
      offset = queried.value.nextOffset;
    }
    return { error: "", objects, complete: offset === null, total };
  });
  expect(result.error).toBe("");
  expect(result.complete, "Native object pagination must finish").toBe(true);
  expect(result.objects).toHaveLength(result.total);
  expect(new Set(result.objects.map((object) => `${object.id}:${object.generation}`)).size).toBe(result.total);
  return result.objects;
}

function parseInspector(raw: unknown) {
  const text = z.string().safeParse(raw);
  expect(text.success, "Native inspector export must return JSON").toBe(true);
  if (!text.success) return null;
  const json = Result.fromThrowable((): unknown => JSON.parse(text.data), () => "Invalid inspector JSON")();
  expect(json.isOk()).toBe(true);
  if (json.isErr()) return null;
  const snapshot = scriptInspectorSchema.safeParse(json.value);
  expect(snapshot.success, JSON.stringify(snapshot.error)).toBe(true);
  return snapshot.success ? snapshot.data : null;
}
