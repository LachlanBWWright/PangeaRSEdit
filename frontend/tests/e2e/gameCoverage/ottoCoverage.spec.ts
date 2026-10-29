import { expect, test, type Page } from "@playwright/test";
import { launchReloadTarget, reloadTargets, replaceRuntimeSource } from "../runtimeReloadFixture";
import { runtimeHealth, runtimeInspector } from "../scriptRuntimeHealth";
import { installStreamingProbe } from "../runtimeStreamingProgressFixture";
import { ottoCheckpointScript } from "./ottoCheckpointFixture";
import { waitForOttoLanding } from "../runtimeNativeReadiness";

const target = reloadTargets.find((candidate) => candidate.name === "Otto Matic");

async function markerState(page: Page, definition: string) {
  return (await runtimeInspector(page))?.objects.find((object) => object.definition === definition)?.state;
}

async function expectHealthy(page: Page) {
  expect(await runtimeHealth(page)).toMatchObject({
    enabled: true, bundleLoaded: true, scriptsDisabled: false, errorCount: 0, budgetExceeded: 0, lastError: "",
  });
  expect(await runtimeInspector(page)).toMatchObject({ commandRejections: 0, callbackFailures: 0 });
}

test("Otto native checkpoint respawn restores state and position and cancels owned work across repeated deaths", async ({ page }) => {
  test.setTimeout(180_000);
  expect(target).toBeDefined();
  if (!target) return;
  await launchReloadTarget(page, target);
  await waitForOttoLanding(page);
  expect(await replaceRuntimeSource(page, ottoCheckpointScript)).toBe(0);
  await expect.poll(async () => Number((await markerState(page, "reload-probe"))?.tasks)).toBeGreaterThan(3);
  const before = (await runtimeInspector(page))?.objects.find((object) => object.definition === "reload-probe");
  expect(before).toBeDefined();
  for (const attempt of [1, 2, 3]) {
    if (attempt > 1) {
      await expect.poll(() => markerState(page, "reload-probe")).toMatchObject({ displaced: "true" });
    }
    expect(await page.evaluate(() => window.Module?.ccall?.("OttoScript_ProbeDeathJS", "number", [], []))).toBe(1);
    await expect.poll(() => markerState(page, "reload-probe")).toMatchObject({
      deaths: String(attempt), respawns: String(attempt), resets: String(attempt), checkpointValue: "modified-after-reset",
    });
    const inspector = await runtimeInspector(page);
    const marker = inspector?.objects.find((object) => object.definition === "reload-probe");
    expect(marker && { id: marker.id, generation: marker.generation }).toEqual(before && { id: before.id, generation: before.generation });
    expect(inspector?.runtime).toMatchObject({ timers: 0, tasks: 0, subscriptions: 0 });
    expect(Number(marker?.state.timers)).toBeGreaterThan(0);
    expect(marker?.state.timers).toBe(marker?.state.ticksAtReset);
    expect(marker?.state.tasks).toBe(marker?.state.tasksAtReset);
    expect(marker?.state.events).toBe(marker?.state.eventsAtReset);
    await expectHealthy(page);
  }
});

test("Otto native terrain reentry invalidates old generations and stops every owned work type", async ({ page }) => {
  test.setTimeout(180_000);
  expect(target).toBeDefined();
  if (!target) return;
  await launchReloadTarget(page, target);
  await waitForOttoLanding(page);
  expect(await installStreamingProbe(page)).toBe(true);
  await expect.poll(() => markerState(page, "acceptance-marker"), { timeout: 90_000 }).toMatchObject({ stage: "complete" });
  const state = await markerState(page, "acceptance-marker");
  expect(state).toMatchObject({ oldExists: "false", childExists: "false" });
  expect(Number(state?.streamIns)).toBeGreaterThanOrEqual(2);
  expect(Number(state?.streamOuts)).toBeGreaterThanOrEqual(1);
  expect(Number(state?.taskTicks)).toBeGreaterThan(3);
  expect(Number(state?.ownerEvents)).toBeGreaterThan(3);
  expect(state?.ticks).toBe(state?.ticksAtExit);
  expect(state?.taskTicks).toBe(state?.tasksAtExit);
  expect(state?.ownerEvents).toBe(state?.eventsAtExit);
  expect(`${state?.oldId}:${state?.oldGeneration}`).not.toBe(`${state?.replacementId}:${state?.replacementGeneration}`);
  expect(Number(state?.replacementGeneration)).toBeGreaterThan(0);
  expect((await runtimeInspector(page))?.runtime).toMatchObject({ timers: 0, tasks: 0, subscriptions: 0 });
  await expectHealthy(page);
});
