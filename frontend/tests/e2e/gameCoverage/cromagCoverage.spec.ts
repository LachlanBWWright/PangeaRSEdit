import { expect, test, type Page } from "@playwright/test";
import { launchReloadTarget, replaceRuntimeSource, type ReloadTarget } from "../runtimeReloadFixture";
import { runtimeHealth, runtimeInspector, runtimeObjectDefinition } from "../scriptRuntimeHealth";
import { routeRuntimeCallbacks } from "../runtimeScriptLifecycle";
import { captureCompletionScript, raceCompletionScript, ruleOwnershipScript } from "./cromagCoverageFixture";

const raceTarget: ReloadTarget = {
  name: "Cro-Mag Rally", path: "cromagrally/CroMagRally.html", query: "track=3&car=1",
  level: 2, asset: "games/cromagrally/skeletons/GragStanding.bg3d",
};

async function markerState(page: Page) {
  return (await runtimeInspector(page))?.objects.find((object) => runtimeObjectDefinition(object) === "reload-probe")?.state;
}

async function runProbe(page: Page, source: string, target = raceTarget, expectedErrors = 0) {
  await launchReloadTarget(page, target);
  expect(await replaceRuntimeSource(page, routeRuntimeCallbacks(source))).toBe(0);
  await expect.poll(async () => Number((await markerState(page))?.frames), { timeout: 30_000 }).toBeGreaterThanOrEqual(20);
  expect(await runtimeHealth(page)).toMatchObject({ enabled: true, scriptsDisabled: false, budgetExceeded: 0, errorCount: expectedErrors });
}

test("Cro-Mag native race completion remains exactly once across repeated Lua requests and isolates the other racer", async ({ page }) => {
  await runProbe(page, raceCompletionScript);
  expect(await markerState(page)).toMatchObject({ finishes: "1", complete: "true", otherComplete: "false" });
});

test("Cro-Mag native lap ownership rejects invalid writes, isolates players, and restores native rules", async ({ page }) => {
  await runProbe(page, ruleOwnershipScript, raceTarget, 3);
  expect(await markerState(page)).toMatchObject({ nativeProtected: "true", invalidRejected: "true", playerIsolated: "true", rulesRestored: "true" });
});

test("Cro-Mag capture completion respects rule ownership and emits one native level transition", async ({ page }) => {
  const completions: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("coverage capture completed")) completions.push(message.text());
  });
  await runProbe(page, captureCompletionScript, {
    ...raceTarget, query: "track=10&car=1&mode=capture", level: 9,
  }, 1);
  expect(await markerState(page)).toMatchObject({ nativeProtected: "true", completions: "0", raceFinishes: "0" });
  await expect.poll(() => completions.length, { timeout: 30_000 }).toBe(1);
});
