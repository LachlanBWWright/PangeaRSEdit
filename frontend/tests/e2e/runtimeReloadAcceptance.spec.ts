import { expect, test, type Page } from "@playwright/test";
import { runtimeHealth, runtimeInspector, runtimeObjectDefinition } from "./scriptRuntimeHealth";
import { launchReloadTarget, rejectMalformedConfig, reloadProbeScript, reloadTargets, replaceRuntimeSource } from "./runtimeReloadFixture";

async function observeGeneration(page: Page, generation: number, minimumFrames = 90) {
  await expect.poll(async () => {
    const inspector = await runtimeInspector(page);
    const markers = inspector?.objects.filter((object) => object.state.generation === String(generation));
    if (markers?.length !== 1) return false;
    const marker = markers[0];
    return marker?.state.ownerCleaned === "true" && Number(marker.state.frames) >= minimumFrames;
  }, { timeout: 30_000, message: `Generation ${generation} must run frames and complete native owner cleanup` }).toBe(true);
  const inspector = await runtimeInspector(page);
  expect(inspector).toMatchObject({ enabled: true, disabled: false, budgetOverruns: 0 });
  expect(inspector?.runtime).toMatchObject({ timers: 0, tasks: 0, subscriptions: 0 });
  const customObjects = inspector?.objects.filter((object) => runtimeObjectDefinition(object) === "reload-probe");
  expect(customObjects).toHaveLength(1);
  expect(customObjects?.[0]?.state.generation).toBe(String(generation));
  return customObjects?.[0];
}

for (const target of reloadTargets) {
  test(`${target.name} retains active execution through repeated rejected reloads and cleans each replacement`, async ({ page }) => {
    test.setTimeout(240_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await launchReloadTarget(page, target);
    let marker = await observeGeneration(page, 1);
    for (const generation of [2, 3, 4, 5]) {
      const oldHandle = marker && { id: marker.id, generation: marker.generation };
      const previousFrame = Number(marker?.state.frames);
      expect(await replaceRuntimeSource(page, "return { onFrame = function( invalid lua syntax")).not.toBe(0);
      marker = await observeGeneration(page, generation - 1, previousFrame + 30);
      expect(marker && { id: marker.id, generation: marker.generation }).toEqual(oldHandle);
      expect(await rejectMalformedConfig(page, target.level)).not.toBe(0);
      marker = await observeGeneration(page, generation - 1, Number(marker?.state.frames) + 30);
      expect(marker && { id: marker.id, generation: marker.generation }).toEqual(oldHandle);
      expect(await replaceRuntimeSource(page, reloadProbeScript(generation), generation % 2 === 0 ? target.level : undefined)).toBe(0);
      marker = await observeGeneration(page, generation);
      expect(marker && { id: marker.id, generation: marker.generation }).not.toEqual(oldHandle);
      const snapshot = await runtimeInspector(page);
      expect(snapshot?.objects.some((object) => object.id === oldHandle?.id && object.generation === oldHandle.generation)).toBe(false);
    }
    const health = await runtimeHealth(page);
    expect(health).toMatchObject({ enabled: true, bundleLoaded: true, scriptsDisabled: false, budgetExceeded: 0, lastError: "" });
    expect(await runtimeInspector(page)).toMatchObject({ commandRejections: 0, callbackFailures: 0 });
    expect(errors).toEqual([]);
  });
}

test("Otto Matic repeatedly dispatches native death and checkpoint respawn after Lua reloads", async ({ page }) => {
  test.setTimeout(210_000);
  const target = reloadTargets.find((candidate) => candidate.name === "Otto Matic");
  expect(target).toBeDefined();
  if (!target) return;
  await launchReloadTarget(page, target);
  await observeGeneration(page, 1);
  for (const attempt of [1, 2, 3]) {
    const nativeResult = await page.evaluate(() => window.Module?.ccall?.("OttoScript_ProbeDeathJS", "number", [], []));
    expect(nativeResult).toBe(1);
    await expect.poll(async () => {
      const inspector = await runtimeInspector(page);
      return inspector?.objects.find((object) => object.state.generation === "1")?.state;
    }, { timeout: 30_000 }).toMatchObject({ deaths: String(attempt), respawns: String(attempt) });
  }
  expect(await replaceRuntimeSource(page, reloadProbeScript(2))).toBe(0);
  await observeGeneration(page, 2);
  expect(await page.evaluate(() => window.Module?.ccall?.("OttoScript_ProbeDeathJS", "number", [], []))).toBe(1);
  await expect.poll(async () => {
    const inspector = await runtimeInspector(page);
    return inspector?.objects.find((object) => object.state.generation === "2")?.state;
  }).toMatchObject({ deaths: "1", respawns: "1" });
});
