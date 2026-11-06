import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { buildScriptWorkspaceFromUI, openScriptWorkspace } from "./scriptWorkspaceTestHelpers";
import { launchOttoPackage } from "./scriptPackageRuntime";
import { expectNoLuaFailures, runtimeHealth, runtimeObjects } from "./scriptRuntimeHealth";

test.use({ actionTimeout: 15_000 });

test("opens the flag-gated Earth Farm variant and plays its exported Brain Alien spawner", async ({ page }, info) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => window.localStorage.setItem("pangea-feature-flags", JSON.stringify({ sampleScriptingLevels: false, scripting: false })));
  await page.goto("./");
  const sample = page.getByRole("button", { name: /Earth Farm — Brain Alien spawner/ });
  await expect(sample).toHaveCount(0);
  await page.getByRole("button", { name: "Open settings" }).click();
  const flag = page.getByRole("menuitemcheckbox", { name: /^Sample scripting levels/ });
  await flag.click();
  await expect(flag).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(sample).toBeVisible();
  await sample.click();
  await expect(page.getByRole("button", { name: "Level Actions", exact: true })).toBeVisible({ timeout: 45_000 });
  await page.getByRole("tab", { name: "Scripts", exact: true }).click({ timeout: 45_000 });
  const workspace = await openScriptWorkspace(page);
  await workspace.getByRole("button", { name: "Objects", exact: true }).click();
  await expect(workspace.getByLabel("Object name", { exact: true })).toHaveValue("Brain Port");
  await expect(workspace.getByLabel("Model scale", { exact: true })).toHaveValue("3.5");
  await buildScriptWorkspaceFromUI(workspace);
  const downloading = page.waitForEvent("download");
  await workspace.getByRole("button", { name: "Export script package", exact: true }).click();
  const archive = info.outputPath("earth-farm-brain-port.zip");
  await (await downloading).saveAs(archive);
  await info.attach("sample-script-package", { path: archive, contentType: "application/zip" });
  const probe = await readFile(new URL("../fixtures/sampleSpawnerProbe.lua", import.meta.url), "utf8");
  const installed = await page.evaluate(async ({ bytes, probe }) => {
    const path = "/PangeaRSEdit/src/editor/subviews/scripts/scriptWorkspaceState.ts";
    const globalsPath = "/PangeaRSEdit/src/data/globals/globals.ts";
    const state: typeof import("../../src/editor/subviews/scripts/scriptWorkspaceState") = await import(path);
    const globals: typeof import("../../src/data/globals/globals") = await import(globalsPath);
    const restored = await state.importScriptPackageZipAsync(new Uint8Array(bytes), state.createScriptWorkspaceContext(globals.OttoGlobals, 0));
    if (restored.isErr()) return { error: restored.error, files: [] };
    const probePath = "Data/Scripts/src/sample-spawner-probe.lua";
    const withProbe = state.setScriptSourceExecutionScope(state.upsertScriptSourceFile(restored.value, probePath, probe), probePath, "game");
    const files = await state.buildScriptPackageFilesAsync(withProbe);
    return files.isErr() ? { error: files.error, files: [] } : { error: "", files: files.value.map((file) => ({ path: file.path, bytes: Array.from(file.bytes) })) };
  }, { bytes: Array.from(await readFile(archive)), probe });
  expect(installed.error).toBe("");
  const messages: string[] = [];
  page.on("console", (message) => messages.push(message.text()));
  await launchOttoPackage(page, installed.files);
  await expect.poll(async () => (await runtimeObjects(page)).find((object) => object.type === "custom.brain-port")?.state,
    { timeout: 60_000 }).toMatchObject({ proofPhase: "complete", persistentPort: "true", replenished: "true", rangePaused: "true" });
  expect((await runtimeObjects(page)).filter((object) => object.state.origin === "independent-brain-port")).toHaveLength(3);
  expect(await runtimeHealth(page)).toMatchObject({ enabled: true, errorCount: 0, lastError: "" });
  expectNoLuaFailures(messages);
});
