import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";
import { launchReloadTarget, reloadTargets } from "./runtimeReloadFixture";
import { runtimeHealth, runtimeInspector, runtimeObjectDefinition } from "./scriptRuntimeHealth";
import { installAcceptanceProbe, installStreamingProbe, raceProgressScript } from "./runtimeStreamingProgressFixture";
import { waitForOttoLanding } from "./runtimeNativeReadiness";

async function markerState(page: Page) {
  const inspector = await runtimeInspector(page);
  return inspector?.objects.find((object) => runtimeObjectDefinition(object) === "acceptance-marker")?.state;
}

test("Otto native terrain streaming releases owned resources and recreates a replacement with a fresh handle", async ({ page }) => {
  test.setTimeout(180_000);
  const target = reloadTargets.find((candidate) => candidate.name === "Otto Matic");
  expect(target).toBeDefined();
  if (!target) return;
  await launchReloadTarget(page, target);
  await waitForOttoLanding(page);
  expect(await installStreamingProbe(page)).toBe(true);
  await expect.poll(() => markerState(page), { timeout: 90_000 }).toMatchObject({ stage: "complete" });
  const state = await markerState(page);
  expect(state).toMatchObject({ oldExists: "false", childExists: "false" });
  expect(Number(state?.streamIns)).toBeGreaterThanOrEqual(2);
  expect(Number(state?.streamOuts)).toBeGreaterThanOrEqual(1);
  expect(state?.ticks).toBe(state?.ticksAtExit);
  expect((await runtimeInspector(page))?.runtime).toMatchObject({ timers: 0, tasks: 0, subscriptions: 0 });
  expect(await runtimeHealth(page)).toMatchObject({ enabled: true, scriptsDisabled: false, budgetExceeded: 0, lastError: "" });
});

test("Cro-Mag native checkpoint crossings advance laps and complete a race with matching Lua events", async ({ page }) => {
  test.setTimeout(180_000);
  const target = reloadTargets.find((candidate) => candidate.name === "Cro-Mag Rally");
  expect(target).toBeDefined();
  if (!target) return;
  await launchReloadTarget(page, target);
  expect(await installAcceptanceProbe(page, raceProgressScript)).toBe(true);
  await expect.poll(async () => (await markerState(page))?.nativeComplete).toBe("false");
  const count = await page.evaluate(() => window.Module?.ccall?.("CroMagScript_ProbeCheckpointCrossingJS", "number", ["number"], [-1]));
  const parsedCount = z.number().int().min(3).safeParse(count);
  expect(parsedCount.success).toBe(true);
  if (!parsedCount.success) return;
  const checkpointCount = parsedCount.data;
  const initialLap = Number((await markerState(page))?.nativeLap);
  for (let circuit = 0; circuit < 5; circuit++) {
    const result = await page.evaluate((checkpointCount) => {
      const call = window.Module?.ccall;
      if (!call) return [];
      return Array.from({ length: checkpointCount + 1 }, (_, checkpoint) =>
        call("CroMagScript_ProbeCheckpointCrossingJS", "number", ["number"], [checkpoint % checkpointCount]));
    }, checkpointCount);
    expect(result.every((checkpoint) => checkpoint >= 0)).toBe(true);
    await expect.poll(async () => Number((await markerState(page))?.nativeLap)).toBeGreaterThan(initialLap);
    const state = await markerState(page);
    if (state?.nativeComplete === "true") break;
  }
  await expect.poll(() => markerState(page)).toMatchObject({ nativeComplete: "true", finishes: "1", nativeLap: "3", lastLap: "3" });
  const state = await markerState(page);
  expect(Number(state?.checkpoints)).toBeGreaterThan(checkpointCount);
  expect(Number(state?.laps)).toBeGreaterThanOrEqual(3);
  expect(await runtimeHealth(page)).toMatchObject({ enabled: true, scriptsDisabled: false, budgetExceeded: 0, lastError: "" });
});
