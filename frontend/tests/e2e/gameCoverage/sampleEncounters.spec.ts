import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { launchGamePackage } from "../scriptPackageRuntime";
import { runtimeHealth, runtimeInspector, runtimeObjectDefinition, runtimeObjects, expectNoLuaFailures } from "../scriptRuntimeHealth";
import { replaceRuntimeSource } from "../runtimeReloadFixture";

test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return;
  const status = await page.evaluate(() => ({
    inspector: window.Module?.ccall?.("PangeaScript_GetStatusInspectorJSON", "string", [], []),
    error: window.Module?.ccall?.("PangeaScript_GetStatusLastError", "string", [], []),
  }));
  await info.attach("sample-failure", { body: JSON.stringify(status, null, 2), contentType: "application/json" });
});

const samples = [
  { id: "bugdom-alarm", launch: "bugdom/game.html?level=0&embed=1" },
  { id: "bugdom2-course", launch: "bugdom2/Bugdom2.html?level=0", start: "#play-btn" },
  { id: "nanosaur-nest", launch: "nanosaur/index.html?level=0&extreme=0" },
  { id: "nanosaur2-interception", launch: "nanosaur2/Nanosaur2.html?level=0&deferStart=1", start: "#play-btn" },
  { id: "cromag-gates", launch: "cromagrally/CroMagRally.html?track=1&car=1&mode=race" },
  { id: "billy-gallery", launch: "billyfrontier/billyfrontier.html?level=1" },
  { id: "mike-lockdown", launch: "mightymike/index.html?level=0:0&deferStart=1", start: "#play-btn" },
];

for (const sample of samples) {
  test(`${sample.id}: loads stock map and real assets, runs editable package and releases resources on reload`, async ({ page }) => {
    test.setTimeout(180_000);
    const messages: string[] = [];
    page.on("console", (message) => messages.push(message.text()));
    await page.route("**/__sample.html", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><html><body></body></html>" }));
    await page.goto("./__sample.html");
    const probeFile = sample.id === "bugdom2-course" ? "samplePlatformProbe.lua"
      : sample.id === "bugdom-alarm" || sample.id === "nanosaur-nest" ? "sampleNativeInteractionProbe.lua" : null;
    const probe = probeFile ? await readFile(new URL(`../../fixtures/${probeFile}`, import.meta.url), "utf8") : "";
    const installed = await page.evaluate(async ({ id, probe }) => {
      const samplePath = "/PangeaRSEdit/src/editor/subviews/scripts/scriptSampleLevels.ts";
      const workspacePath = "/PangeaRSEdit/src/editor/subviews/scripts/scriptWorkspaceState.ts";
      const module: typeof import("../../../src/editor/subviews/scripts/scriptSampleLevels") = await import(samplePath);
      const workspace: typeof import("../../../src/editor/subviews/scripts/scriptWorkspaceState") = await import(workspacePath);
      const selected = module.SCRIPTING_SAMPLE_LEVELS.find((entry) => entry.id === id);
      if (!selected) return { error: "Sample not found", files: [] };
      const loaded = await module.loadScriptingSampleLevel(selected);
      if (loaded.isErr()) return { error: loaded.error, files: [] };
      const probePath = "Data/Scripts/src/platform-observer.lua";
      const state = probe ? workspace.setScriptSourceExecutionScope(workspace.upsertScriptSourceFile(loaded.value.workspace, probePath, probe), probePath, "game") : loaded.value.workspace;
      const files = await workspace.buildScriptPackageFilesAsync(state);
      return files.isErr() ? { error: files.error, files: [] }
        : { error: "", files: files.value.map((file) => ({ path: file.path, bytes: Array.from(file.bytes) })) };
    }, { id: sample.id, probe });
    expect(installed.error).toBe("");
    await launchGamePackage(page, sample.launch, installed.files, sample.start);
    await expect.poll(async () => (await runtimeInspector(page))?.runtime.levelState,
      { timeout: 45_000 }).toMatchObject({ sample: sample.id });
    await page.waitForTimeout(1500);
    const objects = await runtimeObjects(page);
    const state = (await runtimeInspector(page))?.runtime.levelState;
    expect(state, messages.join("\n")).toBeDefined();
    expect(state?.phase, messages.join("\n")).not.toBe("unavailable");
    expect(objects.filter((object) => runtimeObjectDefinition(object).startsWith("custom.")).length).toBeGreaterThanOrEqual(sample.id === "nanosaur-nest" ? 0 : 1);
    expect(await runtimeHealth(page), messages.join("\n")).toMatchObject({ enabled: true, errorCount: 0, budgetExceeded: 0, scriptsDisabled: false });
    expectNoLuaFailures(messages);
    if (probeFile) {
      await expect.poll(async () => (await runtimeInspector(page))?.runtime.levelState,
        { timeout: 30_000 }).toMatchObject(sample.id === "bugdom2-course"
          ? { platformCarried: "true", proofComplete: "true", progress: "3" } : { proofComplete: "true" });
    }
    await test.info().attach("sample-runtime", { body: JSON.stringify({ state, messages }, null, 2), contentType: "application/json" });
    expect(await replaceRuntimeSource(page, "return {}\n")).toBe(0);
    await expect.poll(async () => (await runtimeObjects(page)).filter((object) => runtimeObjectDefinition(object).startsWith("custom.")).length).toBe(0);
  });
}
