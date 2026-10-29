import { expect, type Page } from "@playwright/test";
import { z } from "zod";
import { expectRuntimeHealthy } from "./scriptRuntimeHealth";

const aliveSchema = z.object({ id: z.coerce.number().int().positive(), generation: z.coerce.number().int().positive(), frame: z.coerce.number().int().positive(), health: z.coerce.number() });

function latestPlacement(messages: readonly string[]) {
  for (const message of [...messages].reverse()) {
    const match = message.match(/acceptance placement alive (\d+):(\d+):(\d+):([\d.]+)/);
    if (!match) continue;
    const parsed = aliveSchema.safeParse({ id: match[1], generation: match[2], frame: match[3], health: match[4] });
    if (parsed.success) return parsed.data;
  }
  return null;
}

export async function verifyRejectedReloads(page: Page, messages: readonly string[], originalConfig: string) {
  await expectRuntimeHealthy(page, messages, 0);
  let expectedErrors = 0;
  await expect.poll(() => latestPlacement(messages)?.health).toBe(7);
  const results: { kind: string; status: unknown; error: unknown; activePath: unknown }[] = [];
  const originalPath = await page.evaluate(() => window.Module?.ccall?.("PangeaScript_GetStatusActiveScriptPath", "string", [], []));
  for (const candidate of [
    { kind: "missing", source: null, status: 2 },
    { kind: "syntax", source: "return { invalid = ", status: 3 },
    { kind: "runtime", source: "assert(false, 'acceptance candidate runtime failure')", status: 4 },
    { kind: "config", source: null, status: 8 },
  ]) {
    const before = latestPlacement(messages);
    expect(before).not.toBeNull();
    if (!before) return results;
    const result = await page.evaluate(({ candidate, originalConfig }) => {
      const runtime = window.Module;
      if (!runtime?.FS?.writeFile || !runtime.ccall) return null;
      const script = `Data/Scripts/dist/rejected-${candidate.kind}.lua`;
      if (candidate.source !== null) runtime.FS.writeFile(script, new TextEncoder().encode(candidate.source));
      const config = candidate.kind === "config" ? "{" : originalConfig.replaceAll("Data/Scripts/dist/main.lua", script);
      runtime.FS.writeFile("Data/Scripts/config/levels.json", new TextEncoder().encode(config));
      const status = runtime.ccall("PangeaScript_LoadLevelConfig", "number", ["number"], [0]);
      const error = runtime.ccall("PangeaScript_GetStatusLastError", "string", [], []);
      const activePath = runtime.ccall("PangeaScript_GetStatusActiveScriptPath", "string", [], []);
      runtime.FS.writeFile("Data/Scripts/config/levels.json", new TextEncoder().encode(originalConfig));
      return { status, error, activePath };
    }, { candidate, originalConfig });
    expect(result?.status, JSON.stringify(result)).toBe(candidate.status);
    expect(result?.activePath).toBe(originalPath);
    if (candidate.status !== 2) expectedErrors++;
    await expectRuntimeHealthy(page, messages, expectedErrors);
    if (result) results.push({ kind: candidate.kind, ...result });
    await expect.poll(() => latestPlacement(messages)).toMatchObject({ id: before.id, generation: before.generation, health: 7 });
    await expect.poll(() => latestPlacement(messages)?.frame).toBeGreaterThan(before.frame);
    expect(latestPlacement(messages)).toMatchObject({ id: before.id, generation: before.generation, health: 7 });
  }
  return results;
}
