import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { launchOttoPackage } from "./scriptPackageRuntime";
import { runtimeHealth, runtimeObjects } from "./scriptRuntimeHealth";

const recordings = new WeakMap<Page, string[]>();
test.afterEach(async ({ page }, info) => {
  const messages = recordings.get(page);
  if (!messages || page.isClosed()) return;
  await info.attach("spawner-state", { body: JSON.stringify({ health: await runtimeHealth(page),
    objects: (await runtimeObjects(page)).filter((object) => object.type === "custom.brain-port" || object.type === "ottomatic.player"),
    messages }, null, 2), contentType: "application/json" });
});

test("sample spawner pauses outside range with a free slot and keeps its native handle", async ({ page }) => {
  const probe = await readFile(new URL("../fixtures/sampleSpawnerProbe.lua", import.meta.url), "utf8");
  await page.route("**/__sample-range.html", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><html><body></body></html>" }));
  await page.goto("./__sample-range.html");
  const installed = await page.evaluate(async (probe) => {
    const samplePath = "/PangeaRSEdit/src/editor/subviews/scripts/scriptSampleLevels.ts";
    const workspacePath = "/PangeaRSEdit/src/editor/subviews/scripts/scriptWorkspaceState.ts";
    const sample: typeof import("../../src/editor/subviews/scripts/scriptSampleLevels") = await import(samplePath);
    const workspace: typeof import("../../src/editor/subviews/scripts/scriptWorkspaceState") = await import(workspacePath);
    const model = await fetch("/PangeaRSEdit/games/ottomatic/models/level10_brainboss.bg3d");
    const created = sample.createEarthFarmSpawnerWorkspace(new Uint8Array(await model.arrayBuffer()));
    if (created.isErr()) return { error: created.error, files: [] };
    const path = "Data/Scripts/src/sample-spawner-probe.lua";
    const configured = workspace.setScriptSourceExecutionScope(workspace.upsertScriptSourceFile(created.value, path, probe), path, "game");
    const files = await workspace.buildScriptPackageFilesAsync(configured);
    return files.isErr() ? { error: files.error, files: [] } : { error: "", files: files.value.map((file) => ({ path: file.path, bytes: Array.from(file.bytes) })) };
  }, probe);
  expect(installed.error).toBe("");
  const messages: string[] = [];
  recordings.set(page, messages);
  page.on("console", (message) => messages.push(message.text()));
  await launchOttoPackage(page, installed.files);
  await expect.poll(async () => (await runtimeObjects(page)).find((object) => object.type === "custom.brain-port")?.state,
    { timeout: 45_000 }).toMatchObject({ proofPhase: "complete", persistentPort: "true", replenished: "true", rangePaused: "true" });
  expect(await page.evaluate(() => window.Module?.ccall?.("OttoScript_ProbeCustomObjectGameplayJS", "number",
    ["string", "number", "number"], ["custom.brain-port", 2, 0]))).toBe(0);
  expect(await runtimeHealth(page)).toMatchObject({ errorCount: 0, lastError: "" });
});
