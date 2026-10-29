import { expect, type Page } from "@playwright/test";
import { Result } from "neverthrow";
import { z } from "zod";
import { runtimeHealth } from "./scriptRuntimeHealth";

const configSchema = z.object({ levels: z.record(z.string(), z.object({ customObjects: z.array(z.object({ id: z.string() }).passthrough()) }).passthrough()) }).passthrough();

export async function verifyMeleeOverrides(page: Page, probes: readonly { id: string; weaponType: number; damage: number; mode: string }[], expectedErrors: number) {
  const results = [];
  for (const probe of probes) {
    const status = await page.evaluate(({ id, weaponType, damage }) => window.Module?.ccall?.(
      "OttoScript_ProbeMeleeDamageJS", "number", ["string", "number", "number"], [id, weaponType, damage],
    ), probe);
    expect(status, JSON.stringify(probe)).toBe(0);
    const health = await runtimeHealth(page);
    expect(health?.errorCount, JSON.stringify({ probe, health })).toBe(expectedErrors);
    results.push({ ...probe, status });
  }
  return results;
}

export async function verifyEnemyOwnership(page: Page, customId: string, variantId: string, originalConfig: string, expectedErrors: number) {
  const deleted = [];
  for (const probe of [{ id: customId, native: 0 }, { id: variantId, native: 0 }, { id: "ottomatic.corn", native: 1 }]) {
    const status = await page.evaluate(({ id, native }) => window.Module?.ccall?.(
      "OttoScript_ProbeEnemyOwnershipJS", "number", ["string", "number"], [id, native],
    ), probe);
    expect(status, JSON.stringify(probe)).toBe(0);
    const health = await runtimeHealth(page);
    expect(health?.errorCount, JSON.stringify({ probe, health })).toBe(expectedErrors);
    deleted.push({ ...probe, status });
  }
  const decoded = Result.fromThrowable(() => JSON.parse(originalConfig), () => null)().unwrapOr(null);
  const config = configSchema.safeParse(decoded);
  expect(config.success).toBe(true);
  if (!config.success) return { deleted, reload: null };
  const level = config.data.levels["0"];
  expect(level).toBeDefined();
  if (!level) return { deleted, reload: null };
  const changed = { ...config.data, levels: { ...config.data.levels, "0": { ...level, customObjects: level.customObjects.filter((entry) => entry.id !== variantId) } } };
  const reload = await page.evaluate(({ variantId, changed, originalConfig }) => {
    const runtime = window.Module;
    if (!runtime?.ccall || !runtime.FS?.writeFile) return null;
    const begin = runtime.ccall("OttoScript_BeginEnemyOwnershipReloadProbeJS", "number", ["string"], [variantId]);
    runtime.FS.writeFile("Data/Scripts/config/levels.json", new TextEncoder().encode(changed));
    const loaded = runtime.ccall("PangeaScript_LoadLevelConfig", "number", ["number"], [0]);
    const ended = runtime.ccall("OttoScript_EndEnemyOwnershipReloadProbeJS", "number", [], []);
    runtime.FS.writeFile("Data/Scripts/config/levels.json", new TextEncoder().encode(originalConfig));
    const restored = runtime.ccall("PangeaScript_LoadLevelConfig", "number", ["number"], [0]);
    return { begin, loaded, ended, restored };
  }, { variantId, changed: JSON.stringify(changed), originalConfig });
  expect(reload).toEqual({ begin: 0, loaded: 0, ended: 0, restored: 0 });
  return { deleted, reload };
}
