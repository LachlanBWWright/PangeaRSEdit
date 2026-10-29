import { expect, test, type Page } from "@playwright/test";
import { waitForOttoLanding } from "../runtimeNativeReadiness";
import { launchReloadTarget, reloadTargets, replaceRuntimeSource } from "../runtimeReloadFixture";
import { runtimeHealth, runtimeInspector, runtimeObjectDefinition } from "../scriptRuntimeHealth";
import { ottoCheckpointScript } from "./ottoCheckpointFixture";

async function marker(page: Page) {
  return (await runtimeInspector(page))?.objects.find((object) => runtimeObjectDefinition(object) === "reload-probe");
}

test("Otto repeated native restarts, Lua reloads and checkpoint resets leave no stale handles or owned work", async ({ page }) => {
  test.setTimeout(600_000);
  const target = reloadTargets.find((candidate) => candidate.name === "Otto Matic");
  expect(target).toBeDefined();
  if (!target) return;
  let warmMemory: number | undefined;
  for (let restart = 0; restart < 3; restart++) {
    await launchReloadTarget(page, target);
    await waitForOttoLanding(page);
    let stale: { id: number; generation: number } | undefined;
    for (let reload = 0; reload < 4; reload++) {
      expect(await replaceRuntimeSource(page, ottoCheckpointScript)).toBe(0);
      await expect.poll(async () => Number((await marker(page))?.state.tasks)).toBeGreaterThan(3);
      const current = await marker(page);
      expect(current).toBeDefined();
      const snapshot = await runtimeInspector(page);
      const retired = stale;
      if (retired) expect(snapshot?.objects.some((object) => object.id === retired.id && object.generation === retired.generation)).toBe(false);
      expect(await page.evaluate(() => window.Module?.ccall?.("OttoScript_ProbeDeathJS", "number", [], []))).toBe(1);
      await expect.poll(async () => (await marker(page))?.state).toMatchObject({ deaths: "1", respawns: "1", resets: "1" });
      await expect.poll(async () => Number((await marker(page))?.state.frames), {
        timeout: 20_000,
        message: "checkpoint callbacks must continue across at least 90 native frames",
      }).toBeGreaterThan(90);
      const after = await runtimeInspector(page);
      expect(after?.runtime).toMatchObject({ timers: 0, tasks: 0, subscriptions: 0 });
      const used = after?.runtime?.memoryUsedBytes;
      expect(used).toBeDefined();
      if (used !== undefined) {
        warmMemory ??= used;
        expect(used).toBeLessThan(warmMemory + 1024 * 1024);
      }
      expect(await runtimeHealth(page)).toMatchObject({ enabled: true, scriptsDisabled: false, errorCount: 0, budgetExceeded: 0, lastError: "" });
      stale = current && { id: current.id, generation: current.generation };
    }
  }
});
